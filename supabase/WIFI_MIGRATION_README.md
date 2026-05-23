# Migração: Adicionar Suporte a Câmeras Wi-Fi

## O que esta migração faz

Adiciona o tipo de conexão `'wifi'` para câmeras que se conectam diretamente à rede Wi-Fi sem necessidade de DVR/NVR.

**Exemplos de câmeras Wi-Fi:**
- Intelbras Mibo
- Hikvision Wi-Fi
- Amcrest Wi-Fi

## Como aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Copie e cole o conteúdo do arquivo `migration_add_wifi_connection_type.sql`
5. Clique em **Run**

### Opção 2: Via Supabase CLI

```bash
supabase db push
```

## O que muda no sistema

### Antes
- Câmeras podiam ser apenas: `'analogica'` ou `'ip'`
- Câmeras IP requeriam conexão a um DVR/NVR

### Depois
- Câmeras podem ser: `'analogica'`, `'ip'` ou `'wifi'`
- Câmeras Wi-Fi funcionam como IP mas são independentes
- Podem se conectar diretamente à rede sem DVR/NVR
- Mantêm todas as funcionalidades de streaming RTSP

## Estrutura de câmeras Wi-Fi

Câmeras Wi-Fi têm os mesmos campos que câmeras IP:
- **Endereço IP**: Para acesso via rede
- **MAC Address**: Identificação física
- **Switch PoE**: Opcional (se alimentada via PoE)
- **Visualização ao vivo**: RTSP com autenticação
- **QR Code**: Para acesso via app mobile
- **Foto de instalação**: Registro do local

## Notas técnicas

- A migração remove o constraint antigo e cria um novo com `'wifi'` incluído
- Câmeras existentes sem tipo são definidas como `'analogica'`
- O código do sistema já está atualizado para suportar o tipo `'wifi'`
