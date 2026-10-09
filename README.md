# Central de Recursos Humanos Umuarama — Gestão de Férias

Aplicação web estática (HTML, CSS e JavaScript, sem backend) para gestão de
férias e solicitações da Central de Recursos Humanos da Polícia Penal do
Paraná — Unidade Regional de Umuarama.

## Visão geral

O sistema permite:

- Login de servidores (perfil administrador e perfil comum).
- Painel com visão geral, calendário de férias e tarefas.
- Solicitações de férias (pendentes, aprovadas e recusadas).
- Lançamento de férias e controle de saldos.
- Cadastro de servidores, dados e funções gratificadas.
- Relatórios por mês, ano, unidade e servidor.
- Licença-capacitação e licença especial.

Todos os dados são mantidos localmente no navegador
(`localStorage` / `sessionStorage`) — **não há servidor nem banco de dados**.

## Tecnologias

- HTML5, CSS3 e JavaScript (vanilla, sem framework/build).
- [Lucide](https://lucide.dev/) (ícones, via CDN).
- Google Fonts (DM Sans e Fraunces).

## Como executar

1. Dê duplo clique em `run-site.bat` (abre o `login.html` no navegador), **ou**
2. Abra `login.html` diretamente no navegador.

> Dica: como não há backend, um servidor local simples também funciona, por
> exemplo `python -m http.server` na pasta do projeto.

## Configuração (senha do administrador)

A senha inicial do administrador (usuário `centralrh`) **não** fica no código
versionado. Ela é lida do arquivo local `config.local.js`, que está no
`.gitignore`.

1. Copie `config.local.example.js` para `config.local.js`.
2. Edite `config.local.js` e defina `initialAdminPassword`.

Sem esse arquivo, o login administrativo com senha padrão fica desabilitado
até que uma senha seja configurada/alterada.

## Estrutura

| Arquivo | Descrição |
|---|---|
| `login.html`, `login.css`, `login.js` | Tela e lógica de autenticação |
| `index.html`, `styles.css`, `app.js` | Aplicação principal (painel/gestão) |
| `solicitacao-ferias.html` | Fluxo de solicitação de férias |
| `recusada.html` | Tela de solicitação recusada |
| `intranet.html` | Página da intranet |
| `brasao_ok.png` | Brasão institucional |
| `config.local.js` | Configuração local com a senha do administrador (não versionada) |
| `config.local.example.js` | Modelo da configuração local |
| `run-site.bat` | Atalho para iniciar o site no Windows |
| `VS- CODE.code-workspace` | Workspace do VS Code |

## Aviso

Projeto de uso interno/institucional. A autenticação é **local e de
demonstração** e não deve ser usada como controle de segurança em produção.
