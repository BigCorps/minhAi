export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  console.log('Callback received, code:', code ? 'YES' : 'NO');
  
  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      const result = await supabase.auth.exchangeCodeForSession(code);
      console.log('Session exchange result:', result.data.session ? 'SUCCESS' : 'FAILED');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Error in callback:', error);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error`);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}