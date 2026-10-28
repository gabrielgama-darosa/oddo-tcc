# ODDO — Os Donos da Obra

Versão preparada para o fluxo de parceiros do TCC, preservando a identidade visual do protótipo original.

## O que foi implementado

- cadastro de ferragens parceiras com e-mail e senha;
- login com sessão em cookie `HttpOnly`;
- painel privado por parceiro;
- criação, edição e exclusão dos próprios produtos;
- preço, categoria e imagem por produto;
- upload de imagens no Vercel Blob;
- parceiros cadastrados aparecem automaticamente em **Ferragens parceiras**;
- produtos cadastrados aparecem automaticamente em **Produtos e preços**;
- produtos iguais de ferragens diferentes são agrupados e comparados pelo preço;
- simulador de orçamento continua funcionando com os dados vindos do banco;
- vitrine atualiza automaticamente sem reload (intervalo de 4 s + atualização ao voltar para a aba);
- layout, paleta, tipografia e estrutura visual originais mantidos, com polimento sutil de botões, campos, upload, ações e responsividade;
- correção visual dos botões para impedir texto cortado/desalinhado em diferentes navegadores.

## Arquitetura

- **Frontend:** HTML + CSS + JavaScript puro.
- **Backend:** Vercel Functions em Node.js.
- **Banco:** PostgreSQL via Neon conectado pelo Vercel Marketplace.
- **Imagens:** Vercel Blob.
- **Autenticação:** senha derivada com `scrypt` e sessões persistidas no PostgreSQL.

## Estrutura

```text
/
├── index.html                 # vitrine pública
├── parceiro/index.html        # login, cadastro e painel do parceiro
├── assets/
│   ├── style.css
│   ├── home.js
│   └── partner.js
├── api/
│   ├── catalog.js
│   ├── upload.js
│   ├── auth/
│   │   ├── register.js
│   │   ├── login.js
│   │   ├── logout.js
│   │   └── me.js
│   ├── partner/profile.js
│   └── products/
│       ├── index.js
│       └── [id].js
├── lib/                       # banco, autenticação, validação e HTTP
├── sql/schema.sql             # schema PostgreSQL
└── vercel.json
```

## Deploy no Vercel

### 1. Suba o projeto

Crie um repositório com esta pasta como raiz e importe o repositório no Vercel.

### 2. Adicione o PostgreSQL

No projeto do Vercel, abra **Marketplace / Storage** e conecte um banco **Neon Postgres** ao projeto. A integração deve disponibilizar `DATABASE_URL` automaticamente.

### 3. Crie as tabelas

Execute todo o conteúdo de `sql/schema.sql` no banco conectado. Isso pode ser feito pelo SQL editor/Query do recurso de banco no dashboard do Vercel/Neon.

### 4. (Opcional) Carregue os dados de demonstração

Depois do schema, execute `sql/seed-demo.sql` se quiser iniciar com as três ferragens e os produtos do protótipo original. A senha das contas de demonstração é `demo12345`.

### 5. Adicione o Vercel Blob

Crie/conecte um Blob Store ao mesmo projeto. Projetos novos usam autenticação OIDC automaticamente no runtime da Vercel.

### 6. Faça um novo deploy

Depois de conectar o banco e o Blob, faça redeploy. Não coloque senha do banco no JavaScript do navegador.

## Desenvolvimento local

Para validar a interface sem precisar subir Postgres/Blob:

```bash
npm run dev:mock
```

O servidor de demonstração abre em:

```text
http://127.0.0.1:4174
```

Contas de demonstração do mock:

```text
central@oddo.local / demo12345
casa@oddo.local    / demo12345
mundo@oddo.local   / demo12345
```

O mock existe apenas para QA local. A implantação real usa as Functions + PostgreSQL + Blob.

## Observações de produção

- imagens são limitadas a 4 MB e aceitam JPG, PNG e WEBP;
- o e-mail é único por parceiro;
- um parceiro só pode editar/excluir os próprios anúncios;
- a página pública nunca recebe hash/salt de senha;
- a atualização da vitrine é automática e ocorre em até ~4 segundos sem recarregar a página;
- para um cenário de escala maior ou atualização sub-segundo, o polling pode ser substituído por uma camada de realtime/live-query sem alterar o modelo de dados.

## Guia completo de implantação

Para o passo a passo completo de Vercel + PostgreSQL + Blob, consulte:

```text
DEPLOY-VERCEL.md
```
