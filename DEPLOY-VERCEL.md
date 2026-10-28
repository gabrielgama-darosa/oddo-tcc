# ODDO — Guia de Deploy na Vercel com PostgreSQL

Este guia explica como publicar o projeto ODDO na Vercel usando:

- Frontend em HTML, CSS e JavaScript;
- Vercel Functions para o backend;
- PostgreSQL via Neon;
- Vercel Blob para as imagens dos produtos.

---

## 1. Estrutura correta do projeto

A raiz enviada ao GitHub/Vercel precisa conter diretamente:

```text
/
├── api/
├── assets/
├── lib/
├── parceiro/
├── sql/
│   ├── schema.sql
│   └── seed-demo.sql
├── .env.example
├── index.html
├── package.json
├── README.md
└── vercel.json
```

Se a Vercel enxergar uma pasta `ODDO-final` acima desses arquivos, configure `ODDO-final` como **Root Directory**.

---

## 2. Subir o projeto para o GitHub

Crie um repositório, por exemplo:

```text
oddo-tcc
```

Depois envie **o conteúdo da pasta `ODDO-final`** para a raiz desse repositório.

Via terminal, dentro da pasta `ODDO-final`:

```bash
git init
git add .
git commit -m "Deploy inicial ODDO"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/oddo-tcc.git
git push -u origin main
```

---

## 3. Importar o projeto na Vercel

Na Vercel:

```text
Dashboard
→ Add New
→ Project
→ Import Git Repository
```

Selecione o repositório do ODDO.

### Configuração recomendada

**Framework Preset:**

```text
Other
```

**Root Directory:**

```text
./
```

Se os arquivos estiverem dentro da pasta `ODDO-final`, use:

```text
ODDO-final
```

**Build Command:** deixe vazio/default.

**Output Directory:** deixe vazio/default.

**Install Command:** a Vercel deve detectar `npm install` automaticamente por causa do `package.json`.

Faça o primeiro deploy.

> Neste primeiro deploy a interface pode abrir, mas as rotas que dependem do banco ainda poderão falhar. Isso é esperado enquanto `DATABASE_URL` não estiver configurada.

---

## 4. Criar o PostgreSQL com Neon

Dentro do projeto na Vercel, abra a área de **Storage / Marketplace** e adicione o Neon PostgreSQL.

Nome sugerido para o banco:

```text
oddo-db
```

Para reduzir latência no Brasil, prefira uma região próxima da aplicação, como São Paulo quando disponível.

Conecte o banco ao projeto ODDO.

---

## 5. Confirmar a variável `DATABASE_URL`

Depois de conectar o Neon, vá em:

```text
Project
→ Settings
→ Environment Variables
```

Deve existir:

```text
DATABASE_URL
```

O projeto usa somente essa variável para acessar o PostgreSQL.

Exemplo de formato:

```text
postgresql://usuario:senha@host/database?sslmode=require
```

### Importante

Nunca coloque a `DATABASE_URL`:

- no JavaScript do navegador;
- no `index.html`;
- no GitHub;
- em screenshots públicas.

Ela deve permanecer como variável de ambiente da Vercel.

---

## 6. Criar as tabelas do banco

O banco existe, mas ainda está vazio. Agora é necessário executar:

```text
sql/schema.sql
```

Abra o SQL Editor do Neon, ou a área de Query/Data Browser disponibilizada pela integração da Vercel.

Copie **todo o conteúdo** de:

```text
sql/schema.sql
```

Cole no editor SQL e execute.

O script cria as tabelas principais:

```text
partners
sessions
catalog_products
listings
```

Além dos índices e extensões necessárias.

### Conferência

Execute:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

O resultado esperado contém:

```text
catalog_products
listings
partners
sessions
```

Se essas quatro tabelas aparecerem, o schema foi criado corretamente.

---

## 7. Dados de demonstração — opcional

Se quiser abrir o TCC já com ferragens e produtos de exemplo, execute também:

```text
sql/seed-demo.sql
```

Ele cria dados demonstrativos para facilitar a apresentação.

As contas demo usam a senha:

```text
demo12345
```

Contas previstas no seed:

```text
central@oddo.local
demo12345
```

```text
casa@oddo.local
demo12345
```

```text
mundo@oddo.local
demo12345
```

Se quiser começar com o sistema totalmente vazio, **não execute o seed**.

---

## 8. Configurar armazenamento de imagens com Vercel Blob

No mesmo projeto da Vercel, crie/conecte um **Blob Store**.

Nome sugerido:

```text
oddo-images
```

O backend já usa `@vercel/blob` para enviar as imagens dos produtos.

Projetos novos da Vercel podem usar autenticação por OIDC para Blob sem colocar credencial estática no frontend.

### Regras de upload do projeto

Formatos aceitos:

```text
JPG
PNG
WEBP
```

Limite:

```text
4 MB por imagem
```

A imagem fica no Blob e o PostgreSQL armazena apenas a URL da imagem.

---

## 9. Fazer um novo deploy

Depois de conectar:

```text
PostgreSQL ✓
DATABASE_URL ✓
Schema ✓
Vercel Blob ✓
```

faça um redeploy:

```text
Project
→ Deployments
→ último deployment
→ Redeploy
```

Ou faça um novo commit no GitHub.

---

## 10. Testar a API pública

Com o site publicado, abra:

```text
https://SEU-PROJETO.vercel.app/api/catalog
```

Se tudo estiver correto, a rota retorna JSON.

Se você executou o seed, o JSON já deve conter parceiros/produtos.

Se o banco estiver vazio, ele pode retornar coleções vazias — isso também é válido.

---

## 11. Testar cadastro de parceiro

Abra:

```text
https://SEU-PROJETO.vercel.app/parceiro
```

Crie uma conta de teste, por exemplo:

```text
Nome: Ferragem Teste
Bairro: Centro
WhatsApp: 51999999999
E-mail: teste@teste.com
Senha: 12345678
```

Ao finalizar o cadastro, o sistema deve:

1. criar o parceiro no PostgreSQL;
2. criar uma sessão;
3. gravar um cookie `HttpOnly`;
4. abrir o painel privado do parceiro.

### Conferir diretamente no banco

```sql
SELECT
    id,
    name,
    email,
    created_at
FROM partners
ORDER BY created_at DESC;
```

A nova conta deve aparecer.

---

## 12. Testar cadastro de produto

No painel do parceiro, crie um produto:

```text
Nome: Cimento CP II 50 kg
Categoria: Básicos
Preço: 39.90
```

Envie também uma imagem válida.

Salve.

### Conferir no banco

```sql
SELECT *
FROM catalog_products
ORDER BY id DESC;
```

Depois:

```sql
SELECT *
FROM listings
ORDER BY id DESC;
```

O anúncio criado deve aparecer.

O campo de imagem deve conter uma URL do Vercel Blob.

---

## 13. Testar atualização da home

Abra a home:

```text
https://SEU-PROJETO.vercel.app
```

O produto cadastrado pelo parceiro deve aparecer na vitrine.

A home consulta novamente os dados do backend em aproximadamente 4 segundos e também atualiza ao voltar para a aba.

Teste recomendado:

```text
Navegador/aba 1 → home aberta
Navegador/aba 2 → painel do parceiro
```

Cadastre ou edite um produto no painel e observe a home atualizar poucos segundos depois.

---

## 14. Testar comparação entre ferragens

Entre em outra conta de parceiro e cadastre o mesmo produto com outro preço.

Exemplo:

```text
Cimento CP II 50 kg
R$ 34,90
```

Se outra ferragem já oferece esse mesmo produto, a home deve agrupar as ofertas e destacar o menor preço.

---

## 15. Como o banco está organizado

Modelo principal:

```text
partners
    │
    ├────< sessions
    │
    └────< listings >──── catalog_products
```

### `partners`

Ferragens/parceiros cadastrados.

### `sessions`

Sessões de autenticação dos parceiros.

### `catalog_products`

Representa o produto em si, por exemplo:

```text
Cimento CP II 50 kg
```

### `listings`

Representa a oferta de determinado produto por determinada ferragem, incluindo preço e imagem.

Exemplo conceitual:

```text
Cimento CP II 50 kg
        │
        ├── Ferragem A → R$ 34,90
        ├── Ferragem B → R$ 37,90
        └── Ferragem C → R$ 39,00
```

---

## 16. Arquitetura final

```text
                    INTERNET
                        │
                        ▼
                 VERCEL / CDN
                        │
        ┌───────────────┴──────────────┐
        │                              │
        ▼                              ▼
 HTML / CSS / JS                Vercel Functions
                                       │
                         ┌─────────────┴────────────┐
                         │                          │
                         ▼                          ▼
                  Neon PostgreSQL             Vercel Blob
                         │                          │
          usuários / sessões / produtos         imagens
```

---

# Solução de problemas

## `DATABASE_URL não configurada`

Verifique:

```text
Vercel
→ Project
→ Settings
→ Environment Variables
```

Confirme que existe:

```text
DATABASE_URL
```

Depois faça um novo deploy.

---

## `relation "partners" does not exist`

O banco está conectado, mas o schema ainda não foi criado.

Execute:

```text
sql/schema.sql
```

no PostgreSQL.

---

## `/api/catalog` retorna 404

A Vercel provavelmente está usando a raiz errada do projeto.

Ela precisa enxergar diretamente:

```text
/api
/package.json
/vercel.json
/index.html
```

Se esses arquivos estiverem dentro de `ODDO-final`, configure:

```text
Settings
→ Build and Deployment
→ Root Directory
→ ODDO-final
```

Depois faça redeploy.

---

## Cadastro funciona, mas imagem não envia

Confira:

1. se um Vercel Blob Store está conectado ao mesmo projeto;
2. se a imagem é JPG, PNG ou WEBP;
3. se a imagem tem menos de 4 MB;
4. se o deploy foi feito novamente depois da configuração do Blob.

---

## O projeto abre, mas não mostra produtos

Teste primeiro:

```text
/api/catalog
```

Se a API retornar erro, resolva o banco/backend antes de verificar a interface.

Se a API retornar dados corretamente, recarregue a home e verifique o console do navegador.

---

# Checklist final do TCC

Antes da apresentação, confira:

```text
[x] Home abre
[x] /api/catalog retorna JSON
[x] /parceiro abre
[x] Cadastro funciona
[x] Login funciona
[x] Logout funciona
[x] Parceiro aparece na home
[x] Criar produto funciona
[x] Upload de imagem funciona
[x] Produto aparece na home
[x] Editar produto funciona
[x] Excluir produto funciona
[x] Duas ferragens podem oferecer o mesmo produto
[x] Menor preço é destacado
[x] Home atualiza sem refresh manual
[x] Dados permanecem após fechar o navegador
[x] Dados permanecem após novo deploy
```

Se todos esses itens estiverem funcionando, o fluxo completo do sistema está operacional com frontend, backend, autenticação, PostgreSQL, armazenamento de imagens e deploy na Vercel.
