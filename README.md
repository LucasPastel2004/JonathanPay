# Jonathan Pay 💸 *(formerly SplitBill)*

O aplicativo definitivo para rachar a conta com os amigos de forma inteligente, rápida e 100% sincronizada na nuvem! Desenvolvido com uma interface moderna (Glassmorphism) e tecnologias serverless.

![Jonathan Pay Preview](public/window.svg)

## ✨ Funcionalidades

- **Login com Google:** Autenticação segura e rápida utilizando o NextAuth.js.
- **Grupos na Nuvem:** Crie grupos para viagens, rolês ou churrascos. Tudo é salvo em tempo real no banco de dados.
- **Carrinho Inteligente:** Adicione itens informando quem pagou e quem consumiu. O Jonathan Pay faz o cálculo sozinho.
- **Acerto de Contas Otimizado:** O algoritmo interno reduz o número de transferências necessárias. Se o João deve para a Maria, e a Maria deve para o Pedro, o app manda o João pagar direto para o Pedro!
- **QR Code Automático de PIX:** O aplicativo gera instantaneamente Códigos PIX (Copia e Cola e QR Code) usando a chave de quem deve receber.
- **Links de Convite:** Envie o link do grupo pelo WhatsApp e seus amigos entrarão automaticamente!

---

## 🚀 Tecnologias Integradas

- [Next.js (App Router)](https://nextjs.org/) - Framework de React (Frontend e APIs Backend)
- [Vercel Postgres (@vercel/postgres)](https://vercel.com/docs/storage/vercel-postgres) - Banco de Dados Cloud SQL (Serverless)
- [NextAuth.js (Auth.js)](https://next-auth.js.org/) - Gerenciamento de Identidade OAuth (Logins via Google)
- **Vanilla CSS:** Designs otimizados manualmente usando variáveis de ambiente do CSS para temas e keyframes para Micro-animações.
- [API Gerar PIX](https://gerarqrcodepix.com.br/) - Serviço de conversão de Chave Pix em payload BRCode e QR Code Image.

---

## 🛠️ Como rodar o projeto localmente

Siga os passos abaixo para testar e contribuir com o **Jonathan Pay** na sua própria máquina.

### 1. Clonar o repositório
```bash
git clone https://github.com/SeuUsuario/JonathanPay.git
cd JonathanPay
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente (`.env.local`)
Crie um arquivo `.env.local` na raiz do projeto contendo as credenciais do seu banco de dados na Vercel e as chaves de API do Google Cloud Console (OAuth Web App):

```env
# Conexões com o Banco de Dados (Vercel Postgres)
POSTGRES_URL="postgres://default:suasenha@ep-bold-surf-1234.us-east-1.postgres.vercel-storage.com:5432/verceldb"
POSTGRES_PRISMA_URL="postgres://default:suasenha@ep-bold-surf-1234.us-east-1.postgres.vercel-storage.com:5432/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:suasenha@ep-bold-surf-1234.us-east-1.postgres.vercel-storage.com:5432/verceldb"
POSTGRES_USER="default"
POSTGRES_HOST="ep-bold-surf-1234.us-east-1.postgres.vercel-storage.com"
POSTGRES_PASSWORD="suasenha"
POSTGRES_DATABASE="verceldb"

# Autenticação Google (GCP Console Credentials)
GOOGLE_CLIENT_ID="seu-id-do-google-aqui.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="sua-chave-secreta-do-google-aqui"

# Configurações do NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="uma-frase-secreta-qualquer-para-encriptar-sessoes"
```

### 4. Inicializar Tabelas (Primeira vez)
Se você estiver subindo um novo banco de dados vazio, acesse localmente a rota oculta abaixo no seu navegador para forçar a criação das tabelas `users`, `groups`, `group_members`, e `items`:

[http://localhost:3000/api/init](http://localhost:3000/api/init)

### 5. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

Abra o seu navegador em [http://localhost:3000](http://localhost:3000) e divirta-se!

---

## 🤝 Contribuições
Sinta-se à vontade para abrir Issues e Pull Requests. Toda ajuda é muito bem vinda, seja melhorando o CSS, organizando componentes ou adicionando métodos de pagamento novos!

## 📜 Licença
Este projeto é Open Source sob a licença **MIT**, sinta-se livre para usar o código e adaptá-lo!
