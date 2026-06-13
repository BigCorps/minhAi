@BigCorps ➜ /workspaces/minhAi (main) $ tree -L 3 -I 'node_modules'
.
├── CHECKLIST.md
├── DIAGNOSTICO_VOZ.md
├── GUIA_IMPLEMENTACAO_COMPLETA.md
├── INTEGRACAO_WAKE_WORD_STATE.md
├── README.md
├── SETUP.md
├── android.keystore
├── app
│   ├── api
│   │   ├── auth
│   │   ├── check-links
│   │   ├── companies
│   │   ├── credits
│   │   ├── edge
│   │   ├── faq
│   │   ├── favicon
│   │   ├── gemini-chat
│   │   ├── google-speech-stream
│   │   ├── google-tts
│   │   ├── groq
│   │   ├── historico-consultas
│   │   ├── og-image
│   │   ├── qrcode
│   │   ├── send-push
│   │   ├── setup
│   │   ├── tuya
│   │   ├── update-profile
│   │   ├── voice
│   │   ├── vosk-proxy
│   │   └── webhooks
│   ├── apple-icon.png
│   ├── arquivos
│   │   └── page.tsx
│   ├── auth
│   │   └── callback
│   ├── aviso
│   │   └── page.tsx
│   ├── build
│   │   ├── generated
│   │   ├── intermediates
│   │   ├── outputs
│   │   └── tmp
│   ├── build.gradle
│   ├── cliente
│   │   └── [slug]
│   ├── dashboard
│   │   ├── DashboardContent.tsx
│   │   ├── DashboardLayoutClient.tsx
│   │   ├── DashboardView.tsx
│   │   ├── agenda
│   │   ├── ajuda
│   │   ├── arquivos
│   │   ├── assistentes
│   │   ├── atendimentos
│   │   ├── cadastros
│   │   ├── credits
│   │   ├── faqs
│   │   ├── functions
│   │   ├── google-connect
│   │   ├── historico
│   │   ├── indicacoes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── perfil
│   │   ├── producao
│   │   ├── saldo
│   │   ├── vendas
│   │   └── webapp
│   ├── debug
│   │   └── page.tsx
│   ├── download
│   │   └── [token]
│   ├── exclusao
│   │   └── page.tsx
│   ├── favicon-96x96.png
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── fila
│   │   └── [slug]
│   ├── fila-acompanhamento
│   │   └── [senhaId]
│   ├── globals.css
│   ├── ia
│   │   ├── [slug]
│   │   └── private
│   ├── icon.jpg
│   ├── icon.png
│   ├── icon192.png
│   ├── indica
│   │   └── [username]
│   ├── kiosk
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── link
│   │   └── [slug]
│   ├── login
│   │   └── page.tsx
│   ├── manifest.webmanifest
│   │   └── route.ts
│   ├── page.tsx
│   ├── para
│   │   └── [slug]
│   ├── pix
│   │   └── [slug]
│   ├── precos
│   │   └── page.tsx
│   ├── robots.ts
│   ├── sitemap.ts
│   ├── src
│   │   └── main
│   ├── sw.js
│   │   └── route.ts
│   ├── termos
│   │   └── page.tsx
│   └── vendas
│       └── [slug]
├── app-release-bundle.aab
├── app-release-signed.apk
├── app-release-signed.apk.idsig
├── app-release-unsigned-aligned.apk
├── build.gradle
├── components
│   ├── AvatarFace.tsx
│   ├── ConversationDetailModal.tsx
│   ├── CopyLinkButton.tsx
│   ├── CreditsCard.tsx
│   ├── CreditsProgressChart.tsx
│   ├── CreditsProgressChartWrapper.tsx
│   ├── FAQManager.tsx
│   ├── PaymentModal.tsx
│   ├── RegisterSW.tsx
│   ├── ThemeToggle.tsx
│   ├── UserProfile.tsx
│   ├── VoiceAssistant
│   │   ├── ActionModals.tsx
│   │   ├── FeatureHighlightModal.tsx
│   │   ├── MicrophoneFeedback.tsx
│   │   ├── TextInputChat.tsx
│   │   ├── TranscriptFeedbackCard.tsx
│   │   ├── VoiceAssistantWithWakeWord.tsx
│   │   ├── WakeWordDetector.ts
│   │   ├── constants.ts
│   │   ├── functions
│   │   ├── handlers
│   │   ├── hooks
│   │   ├── index.ts
│   │   ├── modals
│   │   ├── types.ts
│   │   └── utils
│   ├── WebAppButton.tsx
│   ├── assistant
│   │   ├── AlarmeDisplay.tsx
│   │   ├── AnalisarPlanilhaDisplay.tsx
│   │   ├── AparelhosSmartDisplay.tsx
│   │   ├── BarcodePdvModal.tsx
│   │   ├── BaseModal.tsx
│   │   ├── BuscarEnderecoDisplay.tsx
│   │   ├── CadastrarProdutoDisplay.tsx
│   │   ├── CalculadoraIMCDisplay.tsx
│   │   ├── CalculadoraJurosDisplay.tsx
│   │   ├── CameraCapture.tsx
│   │   ├── CanalYoutubeDisplay.tsx
│   │   ├── CancelAppointmentModal.tsx
│   │   ├── CardapioDisplay.tsx
│   │   ├── CategoryCarousel.tsx
│   │   ├── ChamarGerenteDisplay.tsx
│   │   ├── ClimaTempoDisplay.tsx
│   │   ├── ConfirmPresenceModal.tsx
│   │   ├── ConsultarCEPDisplay.tsx
│   │   ├── ConsultarCnpjModal.tsx
│   │   ├── ConsultarCpfModal.tsx
│   │   ├── ConsultarDDDDisplay.tsx
│   │   ├── ConsultarLeilaoModal.tsx
│   │   ├── ConsultarPlacaModal.tsx
│   │   ├── ContratoEmTextoDisplay.tsx
│   │   ├── ConverterArquivoDisplay.tsx
│   │   ├── ConverterMedidasDisplay.tsx
│   │   ├── CotacaoMoedasDisplay.tsx
│   │   ├── CreateEventModal.tsx
│   │   ├── CriarLembreteDisplay.tsx
│   │   ├── CriarNotaDisplay.tsx
│   │   ├── CronometroDisplay.tsx
│   │   ├── DuplicarImagemDisplay.tsx
│   │   ├── EditarImagemDisplay.tsx
│   │   ├── EnderecoDisplay.tsx
│   │   ├── EnviarArquivoDisplay.tsx
│   │   ├── EnviarSmsDisplay.tsx
│   │   ├── FecharCaixaDisplay.tsx
│   │   ├── FeriadosNacionaisDisplay.tsx
│   │   ├── FichaConversacionalDisplay.tsx
│   │   ├── FichaProducaoDisplay.tsx
│   │   ├── FullModeLayout.tsx
│   │   ├── FunctionCarousel.tsx
│   │   ├── GerarCodigoBarrasDisplay.tsx
│   │   ├── GerarQRCodeDisplay.tsx
│   │   ├── IdentificarFraudeDisplay.tsx
│   │   ├── ImagemEmTextoDisplay.tsx
│   │   ├── ImpressaoLocalDisplay.tsx
│   │   ├── ImpressaoReciboDisplay.tsx
│   │   ├── ImpressaoRemotaDisplay.tsx
│   │   ├── InfinitePayDisplay.tsx
│   │   ├── JuntarPdfsDisplay.tsx
│   │   ├── LembreteRemediosDisplay.tsx
│   │   ├── LerCodigoBarrasDisplay.tsx
│   │   ├── LerQRCodeDisplay.tsx
│   │   ├── ListaComprasDisplay.tsx
│   │   ├── LoginClienteDisplay.tsx
│   │   ├── MercadoPagoPointDisplay.tsx
│   │   ├── MeuCupomDisplay.tsx
│   │   ├── MeuSistemaDisplay.tsx
│   │   ├── MinhasComprasDisplay.tsx
│   │   ├── NossaMarcaDisplay.tsx
│   │   ├── NossoQRCodeDisplay.tsx
│   │   ├── PainelOfertasDisplay.tsx
│   │   ├── PixConfirmationModal.tsx
│   │   ├── PlaylistDisplay.tsx
│   │   ├── PortaRetratoDisplay.tsx
│   │   ├── ProcurarProdutoDisplay.tsx
│   │   ├── QRCodeDisplay.tsx
│   │   ├── RastreioCorreiosDisplay.tsx
│   │   ├── RegistrarVendaDisplay.tsx
│   │   ├── RegistrationDisplay.tsx
│   │   ├── RelatorioVendasDisplay.tsx
│   │   ├── RelogioMundialDisplay.tsx
│   │   ├── RemoverFundoDisplay.tsx
│   │   ├── RescheduleModal.tsx
│   │   ├── RestricoesCNPJDisplay.tsx
│   │   ├── RestricoesCPFDisplay.tsx
│   │   ├── ResultDownloadQR.tsx
│   │   ├── SegundaViaBoletoDisplay.tsx
│   │   ├── SendEmailModal.tsx
│   │   ├── SequenciaVideosDisplay.tsx
│   │   ├── TabelaEmTextoDisplay.tsx
│   │   ├── TemporizadorDisplay.tsx
│   │   ├── TextAssistant.tsx
│   │   ├── TocarMusicaDisplay.tsx
│   │   ├── TocarVideoDisplay.tsx
│   │   ├── TracarRotaDisplay.tsx
│   │   ├── TranscribeAudioModal.tsx
│   │   ├── TranslateTextModal.tsx
│   │   ├── TrocarTurnoDisplay.tsx
│   │   ├── ValidarCupomDisplay.tsx
│   │   ├── VerClientesDisplay.tsx
│   │   ├── VerNoticiasDisplay.tsx
│   │   ├── VerProdutoDisplay.tsx
│   │   ├── VideoCallIncomingDisplay.tsx
│   │   ├── VideoCallRequestDisplay.tsx
│   │   ├── VideoInstrucoesDisplay.tsx
│   │   ├── ViewAgendaModal.tsx
│   │   └── WifiQRCodeDisplay.tsx
│   ├── cliente
│   │   └── dashboards
│   ├── company
│   │   └── CompanyContactsForm.tsx
│   ├── dashboard
│   │   ├── EditarPesquisaModal.tsx
│   │   ├── EditarPreAtendimentoModal.tsx
│   │   ├── LinkNaBioContextWrapper.tsx
│   │   ├── LinkNaBioModal.tsx
│   │   ├── LinkNaBioModalWrapper.tsx
│   │   ├── ModoToggle.tsx
│   │   ├── PesquisasTab.tsx
│   │   ├── PixLinkModal.tsx
│   │   ├── PreAtendimentoTab.tsx
│   │   ├── PushNotificationSetup.tsx
│   │   ├── SetupAssistantChat.tsx
│   │   ├── SetupBanner.tsx
│   │   ├── functions
│   │   ├── producao
│   │   └── vendas
│   ├── indicacoes
│   │   └── ReferralLandingPage.tsx
│   ├── landing
│   │   ├── ComoFuncionaSection.tsx
│   │   ├── ContatoSection.tsx
│   │   ├── DepoimentosSection.tsx
│   │   ├── FAQSection.tsx
│   │   ├── FuncaoCardsSlide.tsx
│   │   ├── Header.tsx
│   │   ├── InicioSection.tsx
│   │   ├── LandingAvatarFace.tsx
│   │   ├── LandingDemoFooter.tsx
│   │   ├── PrecosSection.tsx
│   │   ├── ProvasSociaisSection.tsx
│   │   ├── RecursoCardsSlide.tsx
│   │   ├── RecursoImageSlide.tsx
│   │   ├── VantagensSlide.tsx
│   │   └── WordCarousel.tsx
│   ├── layout
│   │   ├── AssistantSelectorHeader.tsx
│   │   ├── DashboardHeader.tsx
│   │   ├── Sidebar.tsx
│   │   └── UserMenu.tsx
│   ├── pix-link
│   │   ├── PixLinkPage.tsx
│   │   ├── PixQRCodeDisplay.tsx
│   │   └── PixValueForm.tsx
│   ├── producao
│   │   └── TagSelector.tsx
│   ├── providers
│   │   └── ThemeProvider.tsx
│   ├── slug
│   │   ├── SlugFooter.tsx
│   │   └── SlugHeader.tsx
│   └── ui
│       ├── DigitalClock.tsx
│       ├── DrivePickerButton.tsx
│       ├── PublicThemeToggle.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── select.tsx
│       ├── switch.tsx
│       └── toaster.tsx
├── components.json
├── contexts
│   ├── AssistantContext.tsx
│   └── ThemeContext.tsx
├── gradle
│   └── wrapper
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── gradle.properties
├── gradlew
├── gradlew.bat
├── hooks
│   ├── use-toast.ts
│   ├── useBarcodeProductLookup.ts
│   ├── useCart.tsx
│   ├── useGoogleConnected.ts
│   ├── useGroqContext.ts
│   ├── useInactivityDetector.ts
│   ├── useIsMobile.ts
│   ├── useOnlinePresence.ts
│   ├── usePlayText.ts
│   ├── useProfile.ts
│   ├── useSlugPage.ts
│   ├── useSwipe.ts
│   ├── useVoiceRecorder.ts
│   ├── useWakeLock.ts
│   └── useWakeWord.ts
├── lib
│   ├── fichas-calculos.ts
│   ├── function-highlights.ts
│   ├── functions-registry.ts
│   ├── gemini.ts
│   ├── generatePDF.ts
│   ├── google-credentials.ts
│   ├── google-speech-streaming.ts
│   ├── google-speech-websocket-enhanced.ts
│   ├── google-speech-websocket.ts
│   ├── google-tts.ts
│   ├── groq-intent-classifier.ts
│   ├── onesignal.ts
│   ├── openai.ts
│   ├── paymentGatewayEntries.ts
│   ├── producao
│   │   └── ciclo-detector.ts
│   ├── produtos-venda.ts
│   ├── routing-utils.ts
│   ├── short-links.ts
│   ├── supabase-admin.ts
│   ├── supabase-browser.ts
│   ├── supabase-client.ts
│   ├── supabase-server.ts
│   ├── supabase.ts
│   ├── thermal-printer-service.ts
│   ├── types
│   │   └── producao.ts
│   ├── utils
│   │   └── anonimizarPII.ts
│   ├── utils.ts
│   ├── voice-command-processor.ts
│   ├── voice-context-detector.ts
│   └── wake-word-generator.ts
├── manifest-checksum.txt
├── middleware.ts
├── next.config.js
├── package-lock.json
├── package.json
├── postcss.config.js
├── public
│   ├── OneSignalSDKWorker.js
│   ├── api.png
│   ├── apple-icon.png
│   ├── dispositivos.png
│   ├── google90ae1b639a70083d.html
│   ├── icon.png
│   ├── icon192.png
│   ├── icons
│   │   └── og-image.png
│   ├── llms.txt
│   ├── logo-circle.png
│   ├── logo.png
│   ├── manifest.json
│   ├── pdf-worker
│   │   └── pdf.worker.min.js
│   ├── perfil1.jpg
│   ├── perfil2.jpg
│   ├── perfil3.jpg
│   ├── sw.js
│   ├── vantagens.png
│   └── webapp.png
├── settings.gradle
├── store_icon.png
├── styles
│   └── react-image-crop.css
├── supabase
│   └── schema.sql
├── tailwind.config.ts
├── tsconfig.json
├── twa-manifest.json
├── types
│   └── index.ts
└── vercel.json