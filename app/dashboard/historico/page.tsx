'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Trash2, User, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Conversation {
  id: string
  assistant_id: string
  assistant_name: string
  user_message: string
  assistant_response: string
  created_at: string
  messages?: Message[]
}

interface Assistant {
  id: string
  name: string
}

export default function HistoricoPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [selectedAssistant, setSelectedAssistant] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadAssistants()
    loadConversations()
  }, [])

  const loadAssistants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('assistants')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setAssistants(data || [])
    } catch (error) {
      console.error('Erro ao carregar assistentes:', error)
    }
  }

  const loadConversations = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          assistant_id,
          created_at,
          messages (
            id,
            role,
            content,
            created_at
          ),
          assistants (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedConversations = (data || []).map(conv => {
        const messages = (conv.messages || []).sort(
          (a: Message, b: Message) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        
        const userMessage = messages.find((m: Message) => m.role === 'user')
        const assistantMessage = messages.find((m: Message) => m.role === 'assistant')

        return {
          id: conv.id,
          assistant_id: conv.assistant_id,
          assistant_name: (conv.assistants as any)?.name || 'Assistente',
          user_message: userMessage?.content || '',
          assistant_response: assistantMessage?.content || '',
          created_at: conv.created_at,
          messages: messages
        }
      })

      setConversations(formattedConversations)
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (conversationId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conversa?')) return

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) throw error

      setConversations(conversations.filter(c => c.id !== conversationId))
    } catch (error) {
      console.error('Erro ao deletar conversa:', error)
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const matchesAssistant = selectedAssistant === 'all' || conv.assistant_id === selectedAssistant
    const matchesSearch = searchTerm === '' || 
      conv.user_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.assistant_response.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.assistant_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesAssistant && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando conversas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Histórico de Conversas</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie as interações dos usuários com seus assistentes.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pergunta, resposta ou assistente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Filtrar por Assistente</label>
            <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
              <SelectTrigger className="relative z-50">
                <SelectValue placeholder="Selecione um assistente" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="all">Todos os assistentes</SelectItem>
                {assistants.map(assistant => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhuma conversa encontrada.
            </CardContent>
          </Card>
        ) : (
          filteredConversations.map(conversation => (
            <Card key={conversation.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-primary">
                    {conversation.assistant_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(conversation.created_at).toLocaleString('pt-BR')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(conversation.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm flex-1">{conversation.user_message}</p>
                </div>
                <div className="flex gap-2 bg-muted/50 p-3 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm flex-1 whitespace-pre-wrap">
                    {conversation.assistant_response}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}