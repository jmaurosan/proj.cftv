# Ambiente demonstrativo — Residencial Digixs

O ambiente demonstrativo apresenta o CFTV.PROJ sem compartilhar infraestrutura ou dados da produção.

## Isolamento obrigatório

- Projeto Supabase exclusivo.
- Projeto Vercel exclusivo.
- Usuários exclusivos da demonstração.
- Storage contendo apenas arquivos genéricos.
- Nenhuma cópia de `.env`, banco, backup, QR Code, IP, telefone, e-mail, foto ou credencial real.

## Acesso

O visitante entra com usuário e senha próprios e recebe o papel `viewer` somente no cliente fictício “Residencial Digixs”. O papel pode consultar o projeto, mas não pode criar, editar ou excluir registros.

Não cadastre senhas de equipamentos no ambiente demo. Quando uma tela precisar demonstrar credenciais, use textos claramente fictícios e mantenha a revelação bloqueada para `viewer`.

## Conteúdo fictício

- 1 condomínio e 3 locais físicos.
- 2 DVRs/NVRs e canais identificados.
- Câmeras analógicas e IP com nomes genéricos.
- Switch PoE, roteador, Power Balun, rack, monitor e nobreak.
- Topologia persistida e organizada.
- Fotos ilustrativas sem pessoas, endereços ou placas.
- Documentos genéricos criados especificamente para demonstração.

## Publicação

1. Criar um projeto Supabase vazio para demo.
2. Aplicar as migrations na ordem documentada.
3. Criar o usuário proprietário que executará o seed.
4. Aplicar o seed fictício.
5. Criar o usuário visitante e vinculá-lo como `viewer`.
6. Configurar um projeto Vercel separado com as variáveis do Supabase demo.
7. Validar isolamento, leitura e bloqueio de todas as mutações.

As credenciais do visitante não devem ser commitadas. Entregue-as ao interessado por canal privado e altere a senha depois da apresentação.
