# SayWhen

Sondagem de disponibilidades para reuniões com muita gente.

O organizador cria a sondagem, indica os horários e **quem é convidado**. Cada
convidado recebe um email com um **link pessoal** — só esse link abre a página
dele, sem conta e sem password. Responde Sim/Não em cada horário, grava e sai.
O organizador vê tudo numa grelha e **recebe um email a cada resposta nova**.

Português, Español e English.

## O que precisa

| Peça | Para quê | Obrigatório |
|---|---|---|
| Render (web service) | alojar a aplicação | sim |
| Postgres (Render, Neon, Supabase…) | guardar sondagens e respostas | recomendado |
| Resend | enviar convites e notificações | sim, para os emails |

Sem Postgres a aplicação guarda tudo num ficheiro JSON — serve para
experimentar, mas no plano gratuito do Render o disco é apagado a cada deploy.
Sem chave do Resend a aplicação continua a funcionar: os emails aparecem no log
e os links pessoais podem ser copiados um a um na página da sondagem.

## Deploy no Render

1. **Novo Web Service** → liga este repositório do GitHub.
   O ficheiro `render.yaml` já define build (`npm install`), start (`npm start`)
   e o health check.
2. Em **Environment**, preenche:

   | Variável | Valor |
   |---|---|
   | `ADMIN_KEY` | uma chave longa à tua escolha (é a password da área do organizador) |
   | `PUBLIC_URL` | o endereço do serviço, ex. `https://saywhen.onrender.com` |
   | `RESEND_API_KEY` | chave criada em resend.com → API Keys |
   | `MAIL_FROM` | `SayWhen <sondagens@mail.miguelbarbosapro.com>` (domínio verificado no Resend) |
   | `DATABASE_URL` | ligação Postgres (ver abaixo) |
   | `UI_LANG` | `pt` |

3. **Base de dados.** Duas hipóteses:
   - *Render Postgres*: cria em New → Postgres e cola o **Internal Database URL**.
     Atenção: as instâncias gratuitas do Render expiram passados 30 dias.
   - *Neon* (ou Supabase): tem plano gratuito permanente. Cria a base, copia a
     connection string e cola em `DATABASE_URL`.

   As tabelas são criadas sozinhas no primeiro arranque.

4. Abre `PUBLIC_URL/admin`, entra com a `ADMIN_KEY` e cria a primeira sondagem.

> No plano gratuito do Render o serviço adormece ao fim de alguns minutos sem
> tráfego. A primeira pessoa a abrir o link pode esperar meio minuto até a
> página aparecer.

## Correr localmente

```bash
npm install
cp .env.example .env      # define pelo menos ADMIN_KEY
node --env-file=.env src/server.js
```

Sem `RESEND_API_KEY` os emails são escritos no terminal, links pessoais
incluídos — dá para testar o circuito todo sem enviar nada.

## Como funciona

- `GET /admin` — área do organizador (protegida pela `ADMIN_KEY`, guardada num
  cookie). Criar sondagens, ver a grelha, lembrar quem falta, fechar com um
  horário, apagar.
- `GET /v/:token` — página do convidado. O token é aleatório (18 bytes) e
  identifica a pessoa: é isso que garante que só os convidados respondem e que
  ninguém responde em nome de outro.
- `POST /v/:token` — grava a resposta e dispara o email de notificação para o
  organizador (com o estado atual e o melhor horário até ao momento).
- `GET /healthz` — estado do serviço, driver de dados e se o email está ligado.

Melhor horário = o que reúne mais "sim"; desempate por menos "não" e depois
pelo mais cedo.

## Contactos e grupos

`GET /admin/contacts` é a agenda. Não é preciso alimentá-la: cada sondagem que
crias ou editas guarda lá os convidados. Depois, no formulário da sondagem,
marcas as pessoas em vez de escrever os nomes todos — e um grupo entra inteiro
de uma vez.

A mesma pessoa nunca fica com duas fichas por ter dois endereços. Quando um
email novo tem o mesmo prefixo e o mesmo nome de alguém que já lá está
(`mbarbosa@seidor.es` e `mbarbosa@seidor.com`), junta-se à ficha existente como
endereço alternativo. Quando só o prefixo bate certo, ou só o nome, a app
propõe a junção mas não decide sozinha — enganar-se aqui era mandar o convite à
pessoa errada. Caixas partilhadas (`geral@`, `info@`) ficam sempre separadas.

## Estrutura

```
src/server.js   rotas e regras
src/store.js    dados (Postgres ou ficheiro JSON)
src/contacts.js agenda: guardar convidados sem duplicar pessoas
src/mail.js     envio via API do Resend
src/views.js    páginas e CSS
src/i18n.js     textos PT / ES / EN
src/util.js     datas, contagens, validação
```

## Notas

- Nada de contas para os convidados: o link pessoal é a credencial. Quem o
  reencaminhar está a dar acesso à resposta dele — é o compromisso normal deste
  tipo de ferramenta.
- Os emails guardados são os que o organizador escreve ao criar a sondagem.
  Apagar a sondagem apaga também os convidados e as respostas.
