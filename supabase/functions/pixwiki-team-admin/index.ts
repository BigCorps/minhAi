import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const PUBLIC_URL = (Deno.env.get('PIXWIKI_PUBLIC_URL') || 'https://pix.wiki').replace(/\/$/, '')

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://pix.wiki',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type TeamRole = 'owner' | 'manager' | 'cashier' | 'viewer' | null

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function validEmail(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function getActor(service: any, req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { user: null, token: '' }
  const { data, error } = await service.auth.getUser(token)
  return { user: error ? null : data?.user || null, token }
}

async function actorRole(service: any, userId: string, companyId: string): Promise<TeamRole> {
  const { data: company } = await service.from('companies')
    .select('id,user_id,segment_key,is_active')
    .eq('id', companyId).eq('segment_key', 'pix_wiki').eq('is_active', true).maybeSingle()
  if (!company) return null
  if (String(company.user_id) === userId) return 'owner'
  const { data: admin } = await service.from('company_admins')
    .select('role').eq('company_id', companyId).eq('user_id', userId).maybeSingle()
  return (admin?.role || null) as TeamRole
}

function canManageTarget(actor: TeamRole, targetRole: TeamRole) {
  if (actor === 'owner') return targetRole !== 'owner'
  if (actor === 'manager') return targetRole === 'cashier'
  return false
}

async function userIdByEmail(service: any, email: string) {
  const { data, error } = await service.rpc('pixwiki_v2_auth_user_id_by_email', { p_email: email })
  if (error) throw error
  return data ? String(data) : null
}

async function pendingInvite(service: any, companyId: string, email: string) {
  const { data } = await service.from('pixwiki_v2_team_invites')
    .select('*').eq('company_id', companyId).eq('email_normalized', email).eq('status', 'pending').maybeSingle()
  return data || null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: cors })

  const service = createClient(SUPABASE_URL, SERVICE_ROLE)
  try {
    const { user, token } = await getActor(service, req)
    if (!user || !token) return new Response(JSON.stringify({ error: 'not_authenticated' }), { status: 401, headers: cors })

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '')
    const companyId = String(body?.company_id || '')

    if (action === 'list') {
      if (!companyId) return new Response(JSON.stringify({ error: 'company_id_required' }), { status: 400, headers: cors })
      const role = await actorRole(service, user.id, companyId)
      if (!['owner', 'manager'].includes(String(role))) return new Response(JSON.stringify({ error: 'company_not_allowed' }), { status: 403, headers: cors })
      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data, error } = await userClient.rpc('pixwiki_v2_team_list', { p_company_id: companyId })
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, actor_role: role, team: data || [] }), { headers: cors })
    }

    if (action === 'invite') {
      if (!companyId) return new Response(JSON.stringify({ error: 'company_id_required' }), { status: 400, headers: cors })
      const role = String(body?.role || '') as TeamRole
      const email = normalizeEmail(body?.email)
      if (!validEmail(email)) return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: cors })
      if (!['manager', 'cashier'].includes(String(role))) return new Response(JSON.stringify({ error: 'invalid_role' }), { status: 400, headers: cors })

      const actor = await actorRole(service, user.id, companyId)
      if (!canManageTarget(actor, role)) return new Response(JSON.stringify({ error: 'role_not_allowed' }), { status: 403, headers: cors })

      const { data: company } = await service.from('companies').select('id,user_id,name').eq('id', companyId).maybeSingle()
      if (!company) return new Response(JSON.stringify({ error: 'company_not_found' }), { status: 404, headers: cors })

      let targetUserId = await userIdByEmail(service, email)
      if (targetUserId === String(company.user_id)) return new Response(JSON.stringify({ error: 'owner_already_member' }), { status: 409, headers: cors })
      if (targetUserId === user.id) return new Response(JSON.stringify({ error: 'cannot_invite_self' }), { status: 409, headers: cors })

      if (targetUserId) {
        const { data: existing } = await service.from('company_admins').select('role')
          .eq('company_id', companyId).eq('user_id', targetUserId).maybeSingle()
        if (existing) return new Response(JSON.stringify({ error: 'already_member', role: existing.role }), { status: 409, headers: cors })
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      let invite = await pendingInvite(service, companyId, email)
      if (invite) {
        const { data, error } = await service.from('pixwiki_v2_team_invites').update({
          invited_by: user.id, target_user_id: targetUserId, role, expires_at: expiresAt,
          delivery_error: null, updated_at: new Date().toISOString(),
        }).eq('id', invite.id).select('*').single()
        if (error) throw error
        invite = data
      } else {
        const { data, error } = await service.from('pixwiki_v2_team_invites').insert({
          company_id: companyId, invited_by: user.id, target_user_id: targetUserId,
          email, email_normalized: email, role, status: 'pending', expires_at: expiresAt,
        }).select('*').single()
        if (error) throw error
        invite = data
      }

      let deliveryMethod = targetUserId ? 'existing_account' : 'supabase_invite'
      let deliveryError: string | null = null

      if (!targetUserId) {
        const inviteResult = await service.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${PUBLIC_URL}/equipe/aceitar`,
        })
        if (inviteResult.error) {
          deliveryMethod = 'pending_without_email'
          deliveryError = inviteResult.error.message
          // Corrige corrida em que a conta foi criada entre a busca e o envio.
          targetUserId = await userIdByEmail(service, email)
        } else if (inviteResult.data?.user?.id) {
          targetUserId = String(inviteResult.data.user.id)
        }
      }

      await service.from('pixwiki_v2_team_invites').update({
        target_user_id: targetUserId,
        delivery_method: deliveryMethod,
        delivery_error: deliveryError,
        updated_at: new Date().toISOString(),
      }).eq('id', invite.id)

      return new Response(JSON.stringify({
        ok: true,
        invite_id: invite.id,
        email,
        role,
        expires_at: expiresAt,
        existing_account: deliveryMethod === 'existing_account',
        email_sent: deliveryMethod === 'supabase_invite' && !deliveryError,
        delivery_warning: deliveryError ? 'invite_saved_email_not_sent' : null,
      }), { headers: cors })
    }

    if (action === 'change_role') {
      const targetUserId = String(body?.user_id || '')
      const newRole = String(body?.role || '') as TeamRole
      if (!companyId || !targetUserId || !['manager', 'cashier'].includes(String(newRole))) {
        return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: cors })
      }
      const actor = await actorRole(service, user.id, companyId)
      if (actor !== 'owner') return new Response(JSON.stringify({ error: 'owner_required' }), { status: 403, headers: cors })
      const { data: company } = await service.from('companies').select('user_id').eq('id', companyId).maybeSingle()
      if (!company || String(company.user_id) === targetUserId) return new Response(JSON.stringify({ error: 'owner_cannot_be_changed' }), { status: 409, headers: cors })
      const { data: member } = await service.from('company_admins').select('role').eq('company_id', companyId).eq('user_id', targetUserId).maybeSingle()
      if (!member) return new Response(JSON.stringify({ error: 'member_not_found' }), { status: 404, headers: cors })
      const { error } = await service.from('company_admins').update({ role: newRole }).eq('company_id', companyId).eq('user_id', targetUserId)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true, role: newRole }), { headers: cors })
    }

    if (action === 'remove') {
      const targetUserId = String(body?.user_id || '')
      if (!companyId || !targetUserId) return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: cors })
      const actor = await actorRole(service, user.id, companyId)
      if (!['owner', 'manager'].includes(String(actor))) return new Response(JSON.stringify({ error: 'company_not_allowed' }), { status: 403, headers: cors })
      const { data: company } = await service.from('companies').select('user_id').eq('id', companyId).maybeSingle()
      if (!company || String(company.user_id) === targetUserId) return new Response(JSON.stringify({ error: 'owner_cannot_be_removed' }), { status: 409, headers: cors })
      const { data: member } = await service.from('company_admins').select('role').eq('company_id', companyId).eq('user_id', targetUserId).maybeSingle()
      if (!member) return new Response(JSON.stringify({ error: 'member_not_found' }), { status: 404, headers: cors })
      if (!canManageTarget(actor, member.role as TeamRole)) return new Response(JSON.stringify({ error: 'role_not_allowed' }), { status: 403, headers: cors })

      const { error } = await service.from('company_admins').delete().eq('company_id', companyId).eq('user_id', targetUserId)
      if (error) throw error
      await service.from('pixwiki_push_subscriptions').update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('company_id', companyId).eq('user_id', targetUserId)
      return new Response(JSON.stringify({ ok: true }), { headers: cors })
    }

    if (action === 'revoke_invite') {
      const inviteId = String(body?.invite_id || '')
      if (!companyId || !inviteId) return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: cors })
      const actor = await actorRole(service, user.id, companyId)
      if (!['owner', 'manager'].includes(String(actor))) return new Response(JSON.stringify({ error: 'company_not_allowed' }), { status: 403, headers: cors })
      const { data: invite } = await service.from('pixwiki_v2_team_invites').select('id,role,status')
        .eq('id', inviteId).eq('company_id', companyId).maybeSingle()
      if (!invite || invite.status !== 'pending') return new Response(JSON.stringify({ error: 'invite_not_found' }), { status: 404, headers: cors })
      if (!canManageTarget(actor, invite.role as TeamRole)) return new Response(JSON.stringify({ error: 'role_not_allowed' }), { status: 403, headers: cors })
      const { error } = await service.from('pixwiki_v2_team_invites').update({
        status: 'revoked', revoked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', inviteId)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), { headers: cors })
    }

    return new Response(JSON.stringify({ error: 'invalid_action' }), { status: 400, headers: cors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    console.error('[pixwiki-team-admin]', message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: cors })
  }
})
