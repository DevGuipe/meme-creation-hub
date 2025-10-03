# Documentação Técnica - Meme Maker Application
## Guia Completo para Reconstrução do Zero

---

## 1. VISÃO GERAL

### 1.1 Propósito da Aplicação
Esta é uma aplicação web de criação de memes que permite aos usuários criar, editar, salvar e compartilhar memes personalizados. A aplicação é projetada para funcionar tanto como uma Progressive Web App quanto integrada com plataformas de mensageria (como Telegram), oferecendo uma experiência fluida em múltiplos contextos de uso.

### 1.2 Características Principais
- **Editor de Memes Visual**: Interface drag-and-drop com canvas interativo para composição de memes usando templates pré-definidos, imagens customizadas e textos estilizados
- **Sistema de Templates**: Biblioteca de templates prontos com diferentes poses, corpos, cabeças e fundos temáticos
- **Galeria Pessoal**: Armazenamento e gerenciamento de memes criados pelo usuário
- **Sistema de Gamificação**: Pontuação e ranking para engajamento dos usuários
- **Exportação Otimizada**: Geração de imagens em formato otimizado para compartilhamento em redes sociais
- **Autenticação Flexível**: Suporte para múltiplos métodos de autenticação (WebApp, URL params, modo desenvolvimento)

### 1.3 Stack Tecnológico Recomendado
- **Frontend**: React 18+ com TypeScript, Vite como build tool
- **UI Framework**: Tailwind CSS para estilização, Radix UI para componentes acessíveis
- **Canvas Engine**: Fabric.js v6 para manipulação de elementos visuais
- **Backend**: Supabase (PostgreSQL + Edge Functions Deno)
- **Storage**: Supabase Storage para armazenamento de imagens
- **State Management**: React Query para cache e sincronização de dados
- **Validação**: Zod para validação de schemas tanto no frontend quanto backend

---

## 2. ARQUITETURA DA APLICAÇÃO

### 2.1 Estrutura de Diretórios

```
/src
  /components        → Componentes React reutilizáveis
    /ui             → Componentes de UI base (shadcn)
    MemeEditor.tsx  → Editor principal de memes
    MemeGallery.tsx → Galeria de memes do usuário
    UserAuth.tsx    → Componente de autenticação
    StatsDisplay.tsx → Exibição de estatísticas/pontuação
  /hooks            → Custom hooks React
    useMemeCanvas.tsx → Lógica do canvas Fabric.js
  /lib              → Utilitários e configurações
    constants.ts    → Constantes da aplicação
    validations.ts  → Schemas de validação Zod
    logger.ts       → Sistema de logging
    messages.ts     → Mensagens de erro/sucesso
    utils.ts        → Funções utilitárias
  /pages            → Páginas da aplicação
    Index.tsx       → Página principal
    NotFound.tsx    → Página 404
  /types            → Definições TypeScript
    index.ts        → Tipos compartilhados
  /assets           → Recursos estáticos
    /backgrounds    → Imagens de fundo
    /bodies         → Sprites de corpos
    /heads          → Sprites de cabeças
    /props          → Elementos decorativos
    /templates      → Estruturas de templates pré-montados
  /integrations     → Integrações externas
    /supabase       → Cliente e tipos Supabase
  /utils            → Utilitários avançados
    edgeInvoke.ts   → Wrapper para chamadas a edge functions
    errorHandling.ts → Tratamento centralizado de erros
    retryLogic.ts   → Lógica de retry para operações críticas

/supabase
  /functions        → Edge Functions (backend serverless)
    /save-meme      → Salvar meme no banco
    /get-user-memes → Buscar memes do usuário
    /delete-meme    → Deletar meme
    /system-status  → Status do sistema
    /_shared        → Código compartilhado entre functions
  /migrations       → Migrações SQL do banco de dados
  config.toml       → Configuração do projeto Supabase
```

### 2.2 Fluxo de Navegação

A aplicação possui 4 estados/views principais:

1. **Auth** → Tela de autenticação (entrada da aplicação)
2. **Home** → Dashboard principal com estatísticas e ações principais
3. **Editor** → Interface de criação/edição de memes
4. **Gallery** → Lista de memes salvos pelo usuário

O fluxo é linear e controlado por uma state machine simples:
- Auth → Home (após autenticação bem-sucedida)
- Home ↔ Editor (criar novo meme)
- Home ↔ Gallery (visualizar memes salvos)
- Editor → Gallery (após salvar meme)

### 2.3 Gerenciamento de Estado

A aplicação utiliza uma combinação de estratégias de state management:

- **Estado Local (useState)**: Para UI temporária (modais, inputs, seleções)
- **React Query**: Para dados do servidor (memes, estatísticas, rankings)
  - Cache automático com revalidação em background
  - Retry logic para requisições falhadas
  - Otimistic updates para melhor UX
- **Refs (useRef)**: Para referências diretas ao canvas Fabric.js e caches de imagens
- **Context**: Não utilizado (aplicação pequena, props drilling aceitável)

---

## 3. SISTEMA DE AUTENTICAÇÃO

### 3.1 Conceito Geral

O sistema de autenticação é projetado para ser **flexível e multi-contexto**, suportando:

1. **Modo WebApp**: Quando rodando dentro de um WebApp (ex: Telegram MiniApp)
   - Usa a API JavaScript do WebApp para obter dados do usuário
   - Valida automaticamente através do SDK fornecido pela plataforma

2. **Modo URL Params**: Quando aberto via deep link/URL parametrizado
   - Extrai userId, username e firstName dos query params
   - Útil para compartilhamento direto e deep linking

3. **Modo Desenvolvimento**: Para testes locais sem dependências externas
   - Cria um usuário mock com ID fixo em range reservado
   - Permite desenvolvimento sem necessidade de setup de WebApp real

### 3.2 Fluxo de Autenticação

**Etapa 1: Detecção do Contexto**
- Verifica se existe window.Telegram.WebApp (rodando em WebApp)
- Se sim, tenta extrair dados de window.Telegram.WebApp.initDataUnsafe.user
- Se não, verifica URL params (?tgUserId=123&tgUsername=john)
- Como último recurso, usa usuário mock de desenvolvimento

**Etapa 2: Validação dos Dados**
- Todos os dados de usuário são validados com schema Zod
- Valida formato do ID (número inteiro positivo dentro de range permitido)
- Valida comprimento de username e first_name

**Etapa 3: Registro/Verificação no Banco**
- Chama função RPC `check_user_exists_by_telegram_id` para verificar se usuário existe
- Se não existir, chama `create_user_if_not_exists` para criar registro
- Ambas as funções usam SECURITY DEFINER para bypass de RLS
- Implementa retry logic com backoff exponencial para resiliência

**Etapa 4: Callback de Sucesso**
- Após validação e registro, dispara callback `onAuthenticated(user)`
- Aplicação transita para estado 'home'
- Dados do usuário são armazenados em estado local

### 3.3 Tratamento de Erros

O sistema implementa mensagens de erro específicas para cada tipo de falha:
- **Network timeout**: "Connection timeout. Please check your internet and try again."
- **Invalid data**: Mostra o erro de validação específico do Zod
- **Database error**: "Database connection failed. Please try again in a moment."
- **No data**: "No Telegram data found. Please open from Telegram app."

Cada erro mostra um botão "Retry" que recarrega a aplicação.

### 3.4 Considerações de Segurança

- **Nunca confiar cegamente em dados do cliente**: Todas as validações são duplicadas no backend
- **IDs de usuário não devem colidir**: Sistema de ranges reservados previne conflitos entre usuários reais e mock
- **Não armazenar tokens sensíveis no frontend**: Se houver tokens de sessão, devem ser em httpOnly cookies
- **Rate limiting**: Implementar no backend para prevenir abuse de endpoints de registro

---

## 4. SISTEMA DE TEMPLATES E ASSETS

### 4.1 Estrutura de Assets

Os assets são organizados em categorias hierárquicas:

**Categorias Base:**
- **backgrounds**: Imagens de fundo para o meme (cenários, texturas)
- **bodies**: Sprites de corpos/posturas
- **heads**: Sprites de cabeças/rostos
- **props**: Elementos decorativos (acessórios, objetos, emojis)

**Formato de Arquivo Recomendado:**
- PNG com transparência (alpha channel) para sprites
- JPG ou WebP para backgrounds
- Dimensões ideais: 512x512 ou 1024x1024 pixels
- Otimização agressiva de tamanho (target: <100KB por asset)

### 4.2 Sistema de Templates

Um **template** é uma composição pré-definida de layers que cria um meme completo.

**Estrutura de um Template:**
```
Template = {
  key: string            // Identificador único (ex: 'classic_chad')
  name: string          // Nome amigável ('Classic Chad')
  thumb_url: string     // URL da thumbnail para preview
  manifest_json: {
    layers: Layer[]     // Array de layers pré-configuradas
  }
}
```

**Layers dentro de um Template:**
Cada template define um conjunto de layers com posições, escalas e rotações pré-definidas. Quando o usuário seleciona um template, essas layers são carregadas no editor e podem ser customizadas.

**Exemplo Conceitual de Manifest:**
```
{
  layers: [
    { type: 'background', content: 'gym', x: 50, y: 50, scale: 1, rotation: 0, zIndex: 0 },
    { type: 'body', content: 'warrior', x: 50, y: 65, scale: 0.8, rotation: 0, zIndex: 1 },
    { type: 'head', content: 'chad-face', x: 50, y: 35, scale: 0.6, rotation: 0, zIndex: 2 },
    { type: 'prop', content: 'trophy', x: 80, y: 30, scale: 0.4, rotation: 15, zIndex: 3 }
  ]
}
```

### 4.3 Sistema de Carregamento de Assets

**Lazy Loading e Cache:**
- Assets só são carregados quando necessários (template selecionado ou layer adicionada)
- Sistema de cache LRU (Least Recently Used) para otimizar memória
- Limite de cache: 20 imagens ou 50MB (o que ocorrer primeiro)
- Quando limite é atingido, remove os assets menos usados

**Detecção de Bounds Transparentes:**
O sistema implementa uma função que detecta automaticamente os pixels visíveis de uma imagem PNG, ignorando margens transparentes:
- Analisa o canal alpha de cada pixel
- Calcula minX, minY, maxX, maxY dos pixels visíveis
- Usa threshold configurável (padrão: 24/255 para bordas gerais, 180/255 para borda inferior)
- Resultado: bounding box real do sprite, permitindo posicionamento preciso

**Cross-Origin e CORS:**
Todas as imagens devem ser carregadas com `crossOrigin='anonymous'` para permitir:
- Manipulação via Canvas API
- Exportação de imagens compostas
- Upload para storage

---

## 5. EDITOR DE MEMES (CANVAS)

### 5.1 Arquitetura do Canvas

O editor utiliza **Fabric.js v6** como engine de manipulação visual.

**Inicialização do Canvas:**
- Canvas HTML5 nativo como base
- Fabric.js instanciado sobre o canvas
- Dimensões: 400x400px para edição (responsivo)
- Background branco sólido
- `preserveObjectStacking: true` para manter ordem das layers

**Sistema de Coordenadas:**
- Coordenadas internas do Fabric: pixels absolutos (0-400)
- Coordenadas de persistência: percentuais (0-100)
- Conversão automática em ambas direções
- Permite canvas responsivo sem quebrar posicionamento

### 5.2 Layer System

Cada elemento no canvas é representado como uma **Layer**:

**Estrutura de Layer:**
```
Layer = {
  id: string              // UUID único
  type: 'background' | 'body' | 'head' | 'prop' | 'text'
  content: string         // Chave do asset ou texto literal
  x: number              // Posição X (percentual 0-100)
  y: number              // Posição Y (percentual 0-100)
  scale: number          // Escala (1 = 100%)
  rotation: number       // Rotação em graus (-360 a 360)
  zIndex: number         // Ordem de renderização (0 = fundo)
  
  // Propriedades específicas de texto (opcionais):
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  textColor?: string
  strokeColor?: string
  strokeWidth?: number
  textAlign?: string
  textShadow?: string   // JSON stringificado de configurações de sombra
}
```

**Tipos de Layers:**
1. **Image Layers** (background, body, head, prop): Renderizam FabricImage
2. **Text Layers**: Renderizam FabricText com estilização completa

### 5.3 Sincronização Bidirecional

O sistema mantém sincronização constante entre:
- **Estado React** (array de layers)
- **Estado Fabric.js** (objetos no canvas)

**React → Fabric (renderCanvas):**
- Dispara quando array de layers muda
- Limpa canvas e recria todos os objetos
- Preserva transformações do usuário (posição, escala, rotação) usando cache de transforms
- Usa render lock para evitar race conditions

**Fabric → React (syncFabricToLayers):**
- Dispara quando usuário modifica objeto no canvas (drag, scale, rotate)
- Debounced em 150ms para evitar updates excessivos
- Converte coordenadas Fabric para percentuais
- Calcula scale relativa ao baseScale (scale que normalizou a imagem originalmente)
- Atualiza array de layers via callback

### 5.4 Manipulação de Imagens

**Carregamento:**
- Todas as imagens são carregadas via helper `loadImage`
- Verifica cache primeiro (O(1) lookup)
- Se não estiver em cache, cria novo HTMLImageElement
- Após carregar, adiciona ao cache LRU

**Normalização de Escala:**
Cada imagem tem dimensões naturais diferentes. O sistema normaliza todas para uma escala base consistente:
- Calcula `baseScale` para que a imagem caiba em um tamanho padrão no canvas
- Armazena `baseScale` em mapa `baseScales.current`
- Quando usuário escala a imagem, calcula `userScale = fabricScale / baseScale`
- Persiste apenas `userScale`, permitindo recarga com dimensões corretas

**Trimming de Transparência:**
Para sprites com muita transparência nas bordas:
- Calcula bounding box real usando `computeAlphaBounds`
- Aplica offset e escala ajustada para mostrar apenas parte visível
- Melhora visual: sprites parecem mais "recortados" e profissionais

### 5.5 Manipulação de Texto

**Criação de Texto:**
- Usa FabricText com configurações ricas
- OriginX='center', OriginY='bottom' para comportamento intuitivo
- Suporte completo a fonte, peso, estilo, cor, stroke, sombra

**Shadow System:**
Sombras são persistidas como JSON stringificado:
```
{
  enabled: boolean,
  color: string,        // rgba(0,0,0,0.5)
  blur: number,         // 0-20
  offsetX: number,      // -10 a 10
  offsetY: number       // -10 a 10
}
```
- Quando enabled=true, cria instância `new Shadow()` do Fabric.js
- Quando enabled=false, shadow=null

**Edição de Texto:**
- Double-click no texto ativa modo de edição inline do Fabric.js
- Todas as mudanças triggeram syncFabricToLayers
- Validação de comprimento no frontend (280 caracteres)

### 5.6 Interações do Usuário

**Seleção:**
- Click em objeto seleciona
- Mostra bounding box com handles de resize e rotation
- Dispara evento `selection:created` → atualiza selected layer no editor
- Selection:cleared quando clica fora → deseleciona

**Transformações:**
- **Drag**: Move objeto livremente
- **Resize**: Arrasta handles dos cantos (mantém proporção se lockUniScaling=false)
- **Rotate**: Arrasta handle superior central
- Todas as transformações disparam `object:modified`

**Delete:**
- Tecla Delete/Backspace quando objeto selecionado
- Remove do canvas e do array de layers

**Add Layer:**
- Botões no editor adicionam nova layer ao array
- Nova layer aparece centralizada com valores default
- Usuario pode então posicionar/escalar/rotar

### 5.7 Performance e Otimizações

**Render Lock:**
- Promise-based lock para evitar renders simultâneos
- Se render em andamento, aguarda completar antes de iniciar nova
- Previne race conditions e estado inconsistente

**Debouncing:**
- Sync Fabric → React é debounced em 150ms
- Evita centenas de updates durante drag contínuo

**Image Cache:**
- LRU cache com limites de tamanho e memória
- Evita recarregar mesmas imagens repetidamente
- Remove items antigos quando atinge limites

**Lazy Rendering:**
- Layers só são renderizadas quando visíveis no canvas
- Background é sempre renderizado primeiro (zIndex 0)

**Memory Management:**
- Cleanup completo no unmount:
  - Dispose de canvas Fabric.js
  - Clear de todos os timeouts
  - Clear de event listeners
  - Clear de image cache

---

## 6. SALVAMENTO E EXPORTAÇÃO DE MEMES

### 6.1 Fluxo de Salvamento

**Etapa 1: Preparação dos Dados**
- Usuário clica em "Save Meme"
- Sistema valida se há pelo menos uma layer
- Valida comprimento de textos (max 10.000 caracteres por content)
- Gera chave de idempotência única (UUID ou timestamp-based)

**Etapa 2: Exportação da Imagem**
- Canvas Fabric.js exporta para data URL (base64)
- Compressão agressiva aplicada em múltiplos passes:
  - Pass 1: quality 0.75, scale 1.5x, max 600x600px
  - Pass 2: quality 0.65, scale 1.25x, max 500x500px  
  - Pass 3: quality 0.55, scale 1.0x, max 400x400px
- Alvo: <800KB para otimizar compartilhamento
- Formato final: PNG ou JPEG dependendo da transparência

**Etapa 3: Envio para Backend**
Chama edge function `save-meme` com payload:
```
{
  telegramUserId: number,
  templateKey: string,
  layersPayload: Layer[],
  image: string,              // data URL base64
  idempotencyKey: string      // para prevenir duplicatas
}
```

**Etapa 4: Processamento no Backend**
(Ver seção Backend para detalhes)

**Etapa 5: Feedback ao Usuário**
- Loading spinner durante upload
- Toast de sucesso ou erro
- Navegação automática para galeria em caso de sucesso
- Pontos adicionados ao score do usuário

### 6.2 Sistema de Idempotência

Para evitar salvamentos duplicados (double-click, retry, etc):

**Frontend:**
- Gera `idempotencyKey` única antes do envio
- Se request falhar e usuário tentar novamente, usa mesma key

**Backend:**
- Verifica se já existe meme com mesma `idempotency_key`
- Se existir, retorna o meme existente (não cria duplicata)
- Constraint UNIQUE em `memes.idempotency_key` garante atomicidade

### 6.3 Validação de Layers

**Frontend (pré-envio):**
- Mínimo 1 layer, máximo 50 layers
- Content de cada layer: max 10.000 caracteres
- Coordenadas dentro de ranges válidos (-1000 a 1000)
- Scale entre 0.1 e 10
- Rotation entre -360 e 360

**Backend (na recepção):**
- Validação Zod duplica todas as regras do frontend
- Se validação falhar, retorna 400 com detalhes dos erros
- Previne injection attacks e dados malformados

### 6.4 Compressão de Imagem

**Estratégia Multi-Pass:**
O sistema tenta comprimir a imagem em passes sucessivos até atingir o target de tamanho:

1. Renderiza canvas em escala maior (1.5x-2x) para qualidade inicial alta
2. Converte para data URL com quality específica
3. Checa tamanho em bytes do base64
4. Se > target, reduz escala e quality e tenta novamente
5. Máximo 3 tentativas com presets progressivamente mais agressivos

**Fallback:**
Se mesmo após 3 passes a imagem ainda estiver grande:
- Usa a última tentativa (mais comprimida)
- Log de aviso (não bloqueia salvamento)
- Considera aumentar limites de storage

---

## 7. GALERIA DE MEMES

### 7.1 Listagem de Memes

**Busca de Dados:**
- Chama edge function `get-user-memes` com `telegramUserId`
- Backend retorna até 50 memes mais recentes do usuário
- Ordenação: `created_at DESC`
- Filtra apenas memes não deletados (`deleted_at IS NULL`)

**Rendering:**
- Grid responsivo de thumbnails
- Cada item mostra:
  - Thumbnail da imagem
  - Short ID (4-6 dígitos)
  - Data de criação
  - Botões de ação (deletar, compartilhar)

**Loading States:**
- Skeleton loaders enquanto carrega
- Empty state se usuário não tem memes ainda
- Error state se falha ao carregar (com retry button)

### 7.2 Preview e Visualização

**Click em Meme:**
- Abre modal/fullscreen view
- Mostra imagem em tamanho completo
- Informações: ID, data, template usado
- Ações: Share, Delete, Edit (opcional)

**Zoom e Pan:**
- Pinch-to-zoom em mobile
- Scroll/drag para pan
- Reset zoom button

### 7.3 Deleção de Memes

**Fluxo de Delete:**
1. Usuário clica em delete button
2. Confirma ação em alert dialog
3. Chama edge function `delete-meme` com `memeId`
4. Backend faz soft-delete (seta `deleted_at = now()`)
5. Frontend remove meme da lista localmente (optimistic update)
6. Toast de confirmação

**Soft Delete vs Hard Delete:**
- **Soft Delete** (recomendado): seta timestamp em `deleted_at`
  - Permite recuperação posterior
  - Mantém integridade referencial
  - Não remove imagem do storage imediatamente
- **Hard Delete**: remove row do banco
  - Irreversível
  - Requer cascade deletes ou cleanup manual
  - Remove imagem do storage imediatamente

### 7.4 Compartilhamento

**Share Button:**
- Gera deep link para o meme: `https://app.url/?memeId={short_id}`
- Usa Web Share API se disponível:
  ```
  navigator.share({
    title: 'Check out my meme!',
    text: 'I created this epic meme',
    url: deepLink
  })
  ```
- Fallback: copy to clipboard

**Deep Link Handling:**
- Quando usuário abre app via deep link com `?memeId=1234`
- App detecta query param
- Busca meme por `id_short`
- Mostra preview direto (sem precisar autenticar se meme for público)

---

## 8. SISTEMA DE GAMIFICAÇÃO E PONTUAÇÃO

### 8.1 Conceito de Pontos

A aplicação implementa um sistema de pontuação para engajar usuários:

**Eventos que Geram Pontos:**
- **Salvar meme**: +3 pontos (evento `save_meme`)
- **Receber reação**: +1 ponto (evento `reaction_received`)
- **Compartilhar meme**: +1 ponto (evento `share_meme`)
- **Weekly ranking bonus**: +10/+6/+3 pontos para top 3 da semana

**Tabela `popcat_events`:**
```
{
  id: UUID,
  user_id: UUID,
  source: enum ('save_meme', 'reaction_received', 'share_meme', ...),
  amount: integer,
  meme_id: UUID (nullable),
  created_at: timestamp
}
```

### 8.2 Cálculo de Rankings

**Rankings Duplos:**
1. **Global Ranking**: Soma total de pontos desde sempre
2. **Weekly Ranking**: Soma de pontos na semana atual (Monday-Sunday)

**Funções de Ranking:**
- `get_user_ranking(telegram_user_id)`: Retorna scores e ranks de um usuário específico
- `get_user_rankings()`: Retorna ranking global completo (top 100)
- `get_current_week_rankings()`: Retorna ranking da semana atual (top 50)

**Cálculo:**
```sql
SELECT 
  u.id, 
  SUM(pe.amount) as total_score,
  ROW_NUMBER() OVER (ORDER BY SUM(pe.amount) DESC) as rank
FROM users u
LEFT JOIN popcat_events pe ON u.id = pe.user_id
WHERE pe.created_at >= date_trunc('week', CURRENT_DATE)
GROUP BY u.id
ORDER BY total_score DESC
```

### 8.3 Sistema de Badges

Baseado no total de pontos, usuário recebe badges:
- **0-9 pontos**: Rookie 🌱
- **10-49 pontos**: Creator 🎨
- **50-99 pontos**: Expert 💎
- **100-499 pontos**: Master 🔥
- **500+ pontos**: Legend 👑

**Rendering:**
Componente `StatsDisplay` busca dados e mostra:
- Badge icon e nome
- Pontos totais e semanais
- Rank global e semanal
- Progress bar até próximo badge

### 8.4 Reset Semanal

**Objetivo:**
Manter competição ativa resetando leaderboard semanal toda segunda-feira.

**Implementação:**
- Edge function `weekly-reset` executada via cron (Monday 00:00 UTC)
- Salva snapshot do ranking da semana anterior em `leaderboard_snapshots`
- Atribui bonus points aos top 3 da semana
- Ranking semanal automaticamente reseta porque query filtra por `created_at >= current_week`

**Cron Configuration:**
```toml
[functions.weekly-reset]
schedule = "0 0 * * 1"  # Toda segunda às 00:00 UTC
```

---

## 9. BACKEND (EDGE FUNCTIONS)

### 9.1 Arquitetura de Edge Functions

As edge functions são **serverless Deno functions** rodando no Supabase Edge Runtime.

**Características:**
- Deploy automático com o código
- Escalamento horizontal automático
- Latência baixa (edge computing)
- Acesso direto ao banco via `@supabase/supabase-js`
- Isolamento: cada function tem seu próprio runtime

**Estrutura de uma Function:**
```
/supabase/functions/<function-name>/
  index.ts              ← Handler principal
```

**CORS obrigatório:**
Todas as functions devem implementar CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### 9.2 Função: save-meme

**Responsabilidade:**
Salvar um novo meme no banco de dados e fazer upload da imagem para storage.

**Input:**
```
{
  telegramUserId: number,
  templateKey: string,
  layersPayload: Layer[],
  image?: string,            // data URL base64
  idempotencyKey?: string
}
```

**Processo:**
1. Validação do payload com Zod schema
2. Verificação de idempotência (se key fornecida)
3. Resolução de user_id via `get_user_id_by_telegram_id` RPC
   - Se não existir, cria via `create_user_if_not_exists`
4. Geração de short_id via `generate_meme_short_id` RPC
5. Upload de imagem para storage bucket `memes/` (se fornecida)
6. Insert na tabela `memes`
7. Retorno de `{ memeId, id_short, url }`

**Idempotência:**
- Se `idempotencyKey` já existe no banco, retorna meme existente
- Constraint UNIQUE garante não criar duplicatas
- Em caso de conflict, faz SELECT do existente e retorna

**Error Handling:**
- Validação falha: 400 com detalhes dos erros Zod
- Erro de banco: 500 com mensagem genérica (não expor detalhes)
- Erro de storage: 400 com "Image upload failed"
- Timeout: Cliente pode retry com mesma idempotencyKey

**Output:**
```
{
  memeId: UUID,
  id_short: string,
  url: string | null
}
```

### 9.3 Função: get-user-memes

**Responsabilidade:**
Buscar lista de memes de um usuário específico.

**Input:**
```
{ telegramUserId: number }
```

**Processo:**
1. Validação do telegramUserId
2. Resolve user_id via RPC
3. Chama função RPC `get_user_memes(user_uuid)`
4. Retorna array de memes

**RPC Backend:**
```sql
CREATE FUNCTION get_user_memes(user_uuid UUID)
RETURNS TABLE(id, id_short, template_key, layers_payload, image_urls, created_at)
AS $$
  SELECT id, id_short, owner_id, template_key, layers_payload, image_urls, created_at, deleted_at
  FROM memes
  WHERE owner_id = user_uuid AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 50
$$;
```

**Output:**
```
{
  memes: [
    {
      id: UUID,
      id_short: string,
      template_key: string,
      layers_payload: Layer[],
      image_urls: { original: string },
      created_at: timestamp
    },
    ...
  ]
}
```

### 9.4 Função: delete-meme

**Responsabilidade:**
Soft-delete de um meme específico.

**Input:**
```
{
  memeId: UUID,
  telegramUserId: number
}
```

**Processo:**
1. Validação dos inputs
2. Resolve user_id
3. Verifica ownership (meme pertence ao user?)
4. Soft-delete: `UPDATE memes SET deleted_at = NOW() WHERE id = memeId`
5. Opcional: agendar cleanup de imagem do storage (async job)

**Output:**
```
{ success: true }
```

**Error Cases:**
- Meme não existe: 404 "Meme not found"
- Usuário não é owner: 403 "Not authorized"
- Já deletado: 200 "Already deleted" (idempotente)

### 9.5 Função: system-status

**Responsabilidade:**
Health check do sistema para monitoramento.

**Input:** Nenhum (GET request)

**Processo:**
1. Testa conexão com banco (SELECT 1)
2. Testa storage (list files)
3. Retorna status de cada serviço

**Output:**
```
{
  status: 'healthy' | 'degraded' | 'down',
  database: 'ok' | 'error',
  storage: 'ok' | 'error',
  timestamp: ISO string
}
```

### 9.6 Segurança em Edge Functions

**Authentication:**
- Functions podem ser públicas (`verify_jwt = false`) ou privadas
- Para privadas, extrair JWT do header Authorization
- Validar JWT usando `supabase.auth.getUser(token)`
- Para app atual: functions são públicas mas validam `telegramUserId`

**Input Validation:**
- **SEMPRE** validar com Zod antes de processar
- Nunca confiar em dados do cliente
- Sanitizar strings antes de inserir no banco

**SQL Injection:**
- **NUNCA** usar SQL raw com concatenação de strings
- Sempre usar:
  - Supabase client query builder (`.from().select()`)
  - RPC functions com parâmetros tipados
  - Prepared statements se usar SQL direto

**Rate Limiting:**
Implementar rate limiting por userId:
- Redis cache com contador de requests por minuto
- Limites: 60 requests/min por usuário
- 429 Too Many Requests se exceder

**Secrets:**
- Usar `Deno.env.get('SECRET_NAME')` para acessar
- Nunca commitar secrets no código
- Configurar via Supabase Dashboard → Functions → Secrets

---

## 10. BANCO DE DADOS

### 10.1 Schema Overview

O banco possui 7 tabelas principais:

1. **users**: Registro de usuários
2. **memes**: Memes criados
3. **templates**: Templates pré-definidos
4. **assets**: Assets disponíveis (backgrounds, bodies, etc)
5. **popcat_events**: Eventos de pontuação
6. **leaderboard_snapshots**: Snapshots de rankings semanais
7. **reactions**: Reações em memes (opcional, para integração com chat apps)

### 10.2 Tabela: users

**Propósito:**
Armazenar informações de usuários que usam a aplicação.

**Colunas:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indices:**
- Primary key em `id`
- Unique index em `telegram_id` (busca rápida por ID externo)

**RLS (Row Level Security):**
- `permissive_all_users`: Permite todas as operações (função pública de visualização de rankings)

**Observações:**
- `telegram_id` é o identificador externo (do Telegram ou outro provider)
- `id` é UUID interno usado como foreign key
- Não armazena dados sensíveis (email, phone)

### 10.3 Tabela: memes

**Propósito:**
Armazenar memes criados pelos usuários.

**Colunas:**
```sql
CREATE TABLE memes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_short TEXT NOT NULL,
  owner_id UUID NOT NULL,
  template_key TEXT NOT NULL,
  layers_payload JSONB NOT NULL DEFAULT '[]',
  image_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE
);
```

**Indices:**
- Primary key em `id`
- Index em `owner_id` (buscar memes de um usuário)
- Unique index em `id_short` + `owner_id` (short IDs únicos por usuário)
- Unique index em `idempotency_key` (prevenir duplicatas)
- Index em `deleted_at` (filtrar não deletados rapidamente)

**Campos:**
- **id_short**: ID curto de 4-6 dígitos para compartilhamento (gerado por RPC)
- **owner_id**: UUID do usuário criador
- **template_key**: Qual template foi usado como base
- **layers_payload**: JSON array de layers (estrutura completa do meme)
- **image_urls**: JSON object com URLs da imagem renderizada
  - `{ original: 'https://storage.url/meme.png' }`
- **deleted_at**: NULL se ativo, timestamp se deletado (soft delete)
- **idempotency_key**: String única para prevenir salvamentos duplicados

**RLS:**
- `permissive_read_memes`: Qualquer um pode ler (memes são públicos)
- `permissive_all_memes`: Permite todas as operações (gerenciamento via functions)

### 10.4 Tabela: templates

**Propósito:**
Armazenar templates pré-definidos disponíveis para usuários.

**Colunas:**
```sql
CREATE TABLE templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  thumb_url TEXT,
  manifest_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Campos:**
- **key**: Identificador único (ex: 'classic_chad', 'virgin_vs_chad')
- **name**: Nome amigável exibido na UI
- **thumb_url**: URL da thumbnail para preview
- **manifest_json**: JSON com definição das layers do template

**População:**
Templates são inseridos via migrations ou script de seed:
```sql
INSERT INTO templates (key, name, thumb_url, manifest_json) VALUES
('classic', 'Classic', 'https://...', '{"layers": [...]}'),
('warrior', 'Warrior Mode', 'https://...', '{"layers": [...]}');
```

### 10.5 Tabela: assets

**Propósito:**
Catálogo de assets disponíveis (backgrounds, bodies, heads, props).

**Colunas:**
```sql
CREATE TABLE assets (
  key TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'background' | 'body' | 'head' | 'prop'
  url TEXT NOT NULL,
  meta JSONB
);
```

**Uso:**
Quando app carrega, busca lista de assets por tipo:
```sql
SELECT key, url FROM assets WHERE type = 'background';
```

Frontend monta objeto de assets:
```typescript
const assets = {
  backgrounds: { gym: 'url1', beach: 'url2' },
  bodies: { warrior: 'url3', classic: 'url4' },
  ...
};
```

### 10.6 Tabela: popcat_events

**Propósito:**
Registrar eventos de pontuação para gamificação.

**Colunas:**
```sql
CREATE TABLE popcat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL, -- 'save_meme', 'reaction_received', etc
  amount INTEGER NOT NULL DEFAULT 0,
  meme_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indices:**
- Primary key em `id`
- Index em `user_id` + `created_at` (cálculo rápido de scores)
- Index em `created_at` (queries de ranking semanal)

**Inserção:**
Quando ocorre evento de pontuação:
```sql
INSERT INTO popcat_events (user_id, source, amount, meme_id)
VALUES (user_uuid, 'save_meme', 3, meme_uuid);
```

### 10.7 Tabela: leaderboard_snapshots

**Propósito:**
Armazenar snapshots de rankings semanais para histórico.

**Colunas:**
```sql
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id TEXT NOT NULL, -- 'YYYY-WW'
  user_id UUID NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Uso:**
Edge function `weekly-reset` insere snapshot antes do reset:
```sql
INSERT INTO leaderboard_snapshots (week_id, user_id, rank, score)
SELECT '2025-W01', user_id, rank, score FROM get_current_week_rankings();
```

### 10.8 Funções RPC

**generate_meme_short_id(owner_uuid UUID):**
Gera ID curto único de 4-6 dígitos para um usuário:
```sql
CREATE FUNCTION generate_meme_short_id(owner_uuid UUID) RETURNS TEXT AS $$
DECLARE
  short_id TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    short_id := LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 4, '0');
    IF NOT EXISTS (
      SELECT 1 FROM memes 
      WHERE owner_id = owner_uuid 
        AND id_short = short_id 
        AND deleted_at IS NULL
    ) THEN
      RETURN short_id;
    END IF;
    attempts := attempts + 1;
    IF attempts >= 100 THEN
      RAISE EXCEPTION 'Could not generate unique short ID';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**get_user_id_by_telegram_id(telegram_user_id BIGINT):**
Busca UUID interno dado telegram_id:
```sql
CREATE FUNCTION get_user_id_by_telegram_id(telegram_user_id BIGINT) 
RETURNS UUID AS $$
DECLARE user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid FROM users WHERE telegram_id = telegram_user_id;
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**create_user_if_not_exists(telegram_user_id BIGINT, user_first_name TEXT):**
Cria usuário se não existir, retorna UUID:
```sql
CREATE FUNCTION create_user_if_not_exists(
  telegram_user_id BIGINT, 
  user_first_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid FROM users WHERE telegram_id = telegram_user_id;
  IF user_uuid IS NULL THEN
    INSERT INTO users (telegram_id, first_name) 
    VALUES (telegram_user_id, user_first_name) 
    RETURNING id INTO user_uuid;
  END IF;
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**get_user_ranking(user_telegram_id BIGINT):**
Retorna scores e ranks de um usuário:
```sql
CREATE FUNCTION get_user_ranking(user_telegram_id BIGINT)
RETURNS TABLE(
  user_id UUID,
  total_score BIGINT,
  weekly_score BIGINT,
  global_rank BIGINT,
  weekly_rank BIGINT
) AS $$
-- Calcula total e weekly scores
-- Calcula ROW_NUMBER para ranks
-- Retorna linha do usuário específico
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 10.9 Triggers

**Objetivo:**
Não há triggers críticos na aplicação atual. Se necessário, implementar:

**Auto-update de updated_at:**
```sql
CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memes_updated_at
BEFORE UPDATE ON memes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Auto-insert em popcat_events após save meme:**
Poderia ser implementado como trigger, mas melhor fazer explicitamente na edge function para controle fino.

### 10.10 Backups e Manutenção

**Backups:**
- Supabase faz backups automáticos diários
- Configurar retenção: 7 dias rolling backup
- Para backups adicionais: export via pg_dump

**Cleanup de Memes Deletados:**
Agendar edge function para hard-delete de memes com `deleted_at > 90 days`:
```sql
DELETE FROM memes 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days';
```

**Cleanup de Images Órfãs:**
Listar arquivos no storage que não têm row correspondente em `memes.image_urls`:
```typescript
// Pseudo-código
const storageFiles = await storage.list('memes/');
const dbImageUrls = await db.from('memes').select('image_urls');
const orphans = storageFiles.filter(file => !dbImageUrls.includes(file.url));
await Promise.all(orphans.map(file => storage.delete(file.path)));
```

---

## 11. STORAGE (SUPABASE STORAGE)

### 11.1 Bucket Configuration

**Bucket: `memes`**
- **Public**: Sim (imagens podem ser acessadas via URL pública)
- **File size limit**: 10MB por arquivo
- **Allowed MIME types**: image/png, image/jpeg, image/webp, image/gif

**Path structure:**
```
memes/
  {short_id}.png
  {short_id}.png
  ...
```

Naming: usa `id_short` do meme como nome do arquivo, garantindo unicidade por usuário.

### 11.2 Upload Flow

**No save-meme edge function:**
```typescript
// 1. Parse data URL
const match = image.match(/^data:(image\/\w+);base64,(.*)$/);
const contentType = match[1]; // 'image/png'
const base64 = match[2];

// 2. Convert base64 to Uint8Array
const raw = atob(base64);
const bytes = new Uint8Array(raw.length);
for (let i = 0; i < raw.length; i++) {
  bytes[i] = raw.charCodeAt(i);
}

// 3. Upload to storage
const filePath = `${shortId}.png`;
const { error } = await supabase.storage
  .from('memes')
  .upload(filePath, bytes, {
    contentType: contentType,
    upsert: true  // Substituir se já existir
  });

// 4. Get public URL
const { data } = supabase.storage
  .from('memes')
  .getPublicUrl(filePath);

const publicUrl = data.publicUrl;
```

### 11.3 Download e Serving

**Public URLs:**
Formato: `https://project-ref.supabase.co/storage/v1/object/public/memes/{short_id}.png`

**Características:**
- URLs são permanentes (enquanto arquivo existir)
- CDN edge caching automático
- Suporte a range requests (para streaming)
- CORS habilitado para cross-origin loading

**No frontend:**
```typescript
<img 
  src={meme.image_urls.original} 
  alt="Meme"
  loading="lazy"
  crossOrigin="anonymous"
/>
```

### 11.4 Storage Policies (RLS)

**Policy: Allow public read**
```sql
CREATE POLICY "Public meme images" ON storage.objects
FOR SELECT
USING (bucket_id = 'memes');
```

**Policy: Authenticated upload**
```sql
CREATE POLICY "Authenticated upload memes" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'memes' AND
  auth.role() = 'authenticated'
);
```

**Observação:**
Como app não usa Supabase auth diretamente, uploads são feitos via SERVICE_ROLE_KEY nas edge functions (bypass RLS).

### 11.5 Cleanup e Garbage Collection

**Manual Cleanup:**
Script para deletar imagens de memes deletados:
```typescript
const { data: deletedMemes } = await supabase
  .from('memes')
  .select('id_short')
  .not('deleted_at', 'is', null);

for (const meme of deletedMemes) {
  await supabase.storage
    .from('memes')
    .remove([`${meme.id_short}.png`]);
}
```

**Automated Cleanup:**
Edge function `cleanup-storage` rodando semanalmente via cron.

### 11.6 Limites e Quotas

**Free Tier:**
- 1GB storage
- 2GB bandwidth/mês
- Suficiente para ~1000 memes de 800KB

**Paid Tiers:**
- $0.021/GB storage/mês
- $0.09/GB bandwidth
- Calcular custos baseado em crescimento esperado

---

## 12. VALIDAÇÕES E SCHEMAS

### 12.1 Validação com Zod

Toda entrada de dados deve ser validada usando Zod schemas:

**Schema de Layer:**
```typescript
const layerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['background', 'body', 'head', 'prop', 'text']),
  content: z.string().max(10_000),
  x: z.number().min(-1000).max(1000),
  y: z.number().min(-1000).max(1000),
  scale: z.number().min(0.1).max(10),
  rotation: z.number().min(-360).max(360),
  zIndex: z.number().int().min(0).max(100),
  // Text props opcionais
  fontSize: z.number().min(8).max(200).optional(),
  fontFamily: z.string().max(100).optional(),
  // ...
});
```

**Schema de Telegram User:**
```typescript
const telegramUserSchema = z.object({
  id: z.number().int().positive().min(1).max(10_000_000_000),
  username: z.string().min(3).max(32).optional(),
  first_name: z.string().max(64).optional()
});
```

**Schema de Save Meme Request:**
```typescript
const saveMemeRequestSchema = z.object({
  telegramUserId: telegramIdSchema,
  templateKey: z.string().trim().min(1).max(100),
  layersPayload: z.union([
    z.array(layerSchema).min(1).max(50),
    z.string().transform((s, ctx) => {
      try {
        return JSON.parse(s);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
        return z.NEVER;
      }
    })
  ]),
  image: z.string()
    .regex(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/)
    .max(10_000_000)
    .optional(),
  idempotencyKey: z.string().min(1).max(100).optional()
});
```

### 12.2 Validação Frontend vs Backend

**Regra de Ouro:**
Toda validação do frontend DEVE ser duplicada no backend.

**Frontend:**
- Validação imediata para UX (feedback instantâneo)
- Previne requests inválidos (economia de banda)
- Usa mesmos schemas Zod que backend

**Backend:**
- Validação obrigatória (nunca confiar no cliente)
- Previne injection attacks
- Garante integridade dos dados

**Sincronização:**
- Definir schemas em arquivo compartilhado `/lib/validations.ts`
- Edge functions importam mesmo schema (Deno permite imports HTTP)
- Alterações em um lugar refletem em ambos os lados

### 12.3 Sanitização de Strings

**XSS Prevention:**
Antes de renderizar strings do usuário:
```typescript
function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}
```

**SQL Injection Prevention:**
- Nunca concatenar strings em queries
- Sempre usar parameterized queries ou query builders
- Validar tipos antes de query

**Path Traversal Prevention:**
Quando usuário fornece filename:
```typescript
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 100);
}
```

### 12.4 Rate Limiting

**Implementação:**
```typescript
const rateLimiter = new Map<string, { count: number; reset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(userId);
  
  if (!limit || now > limit.reset) {
    // Reset window
    rateLimiter.set(userId, { count: 1, reset: now + 60_000 });
    return true;
  }
  
  if (limit.count >= 60) {
    return false; // Rate limit exceeded
  }
  
  limit.count++;
  return true;
}
```

**Aplicação:**
```typescript
if (!checkRateLimit(telegramUserId)) {
  return jsonResponse(429, { 
    error: 'Too many requests. Please wait a moment.' 
  });
}
```

---

## 13. TRATAMENTO DE ERROS

### 13.1 Categorias de Erros

**Client Errors (4xx):**
- 400 Bad Request: Validação falhou
- 401 Unauthorized: Não autenticado
- 403 Forbidden: Sem permissão
- 404 Not Found: Recurso não existe
- 429 Too Many Requests: Rate limit excedido

**Server Errors (5xx):**
- 500 Internal Server Error: Erro genérico no servidor
- 502 Bad Gateway: Serviço downstream falhou
- 503 Service Unavailable: Sistema temporariamente indisponível

### 13.2 Error Handling no Frontend

**Princípios:**
- Sempre mostrar mensagem amigável ao usuário
- Logar erro técnico no console para debug
- Oferecer ação de recovery quando possível (retry, refresh)

**Error Boundaries:**
```typescript
class AppErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    logger.error('React error boundary caught error', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**Toast Notifications:**
Para erros não críticos:
```typescript
try {
  await saveMeme(...);
  toast.success('Meme saved successfully!');
} catch (error) {
  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred';
  toast.error(message);
}
```

**Retry Logic:**
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Retry failed');
}
```

### 13.3 Error Handling no Backend

**Estrutura:**
```typescript
try {
  // Validação
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, {
      error: 'Validation failed',
      details: parsed.error.errors.map(e => `${e.path}: ${e.message}`)
    });
  }
  
  // Lógica de negócio
  const result = await processRequest(parsed.data);
  
  return jsonResponse(200, { data: result });
} catch (error) {
  logger.error('Function error', error);
  
  // Não expor detalhes internos
  return jsonResponse(500, {
    error: 'Internal server error. Please try again later.'
  });
}
```

**Error Messages:**
- **Usuário**: Mensagens claras e acionáveis
- **Logs**: Detalhes técnicos completos para debug
- **Nunca expor**: Stack traces, queries SQL, paths internos

### 13.4 Logging

**Níveis:**
- **DEBUG**: Informações detalhadas para desenvolvimento
- **INFO**: Eventos importantes (user login, meme saved)
- **WARN**: Situações anormais mas recuperáveis
- **ERROR**: Falhas que requerem atenção

**Implementação:**
```typescript
const logger = {
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    // Opcional: enviar para serviço de monitoring (Sentry, etc)
  }
};
```

**O que logar:**
- Início e fim de operações críticas
- Erros com contexto (userId, memeId, timestamp)
- Performance metrics (tempo de operações lentas)
- Rate limit hits

**O que NÃO logar:**
- Dados sensíveis (tokens, passwords)
- PII sem necessidade (IPs, emails)
- Payloads completos de requests grandes

---

## 14. PERFORMANCE E OTIMIZAÇÕES

### 14.1 Frontend Performance

**Code Splitting:**
```typescript
const MemeEditor = lazy(() => import('./components/MemeEditor'));
const MemeGallery = lazy(() => import('./components/MemeGallery'));

<Suspense fallback={<LoadingSpinner />}>
  <MemeEditor />
</Suspense>
```

**Image Optimization:**
- Lazy loading: `<img loading="lazy" />`
- Responsive images: `<img srcset="..." sizes="..." />`
- WebP format quando suportado
- Compressão agressiva (target <100KB por asset)

**Canvas Performance:**
- LRU cache para imagens (evita reloads)
- Render lock (evita renders simultâneos)
- Debounce de sync Fabric → React (150ms)
- Dispose correto de recursos no unmount

**React Query:**
```typescript
const { data: memes, isLoading } = useQuery({
  queryKey: ['user-memes', userId],
  queryFn: () => fetchUserMemes(userId),
  staleTime: 5 * 60 * 1000,  // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
  refetchOnWindowFocus: false
});
```

**Bundle Size:**
- Tree shaking (Vite built-in)
- Remover dependências não usadas
- Usar imports específicos: `import { Button } from 'ui/button'`

### 14.2 Backend Performance

**Database Indices:**
Garantir indices em:
- `users.telegram_id` (unique)
- `memes.owner_id`
- `memes.id_short`
- `popcat_events (user_id, created_at)`

**Query Optimization:**
- Usar `.select('col1, col2')` ao invés de `select('*')`
- Limit em queries de listagem (50-100 items max)
- Usar `maybeSingle()` ao invés de `single()` quando registro pode não existir

**Caching:**
Implementar cache de rankings:
```typescript
const rankingCache = new Map<string, { data: any; expires: number }>();

function getCachedRanking(key: string) {
  const cached = rankingCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  return null;
}

function setCachedRanking(key: string, data: any, ttl: number = 60_000) {
  rankingCache.set(key, { data, expires: Date.now() + ttl });
}
```

**Connection Pooling:**
Supabase client já usa pooling interno, mas em caso de alto tráfego:
- Aumentar `poolSize` nas configurações
- Implementar circuit breaker pattern

### 14.3 Storage Performance

**CDN:**
Supabase Storage usa CDN automaticamente (edge caching).

**Compression:**
- Imagens já são comprimidas no upload
- Considerar WebP para melhor compressão
- Gzip/Brotli para assets estáticos (Vite built-in)

**Parallel Uploads:**
Se múltiplas imagens:
```typescript
await Promise.all(
  images.map(img => storage.upload(img.path, img.data))
);
```

### 14.4 Monitoring

**Métricas a monitorar:**
- Response time de edge functions (p50, p95, p99)
- Taxa de erro por função
- Database query time
- Storage bandwidth usage
- Active users (DAU, MAU)

**Tools:**
- Supabase Dashboard (built-in metrics)
- Sentry para error tracking
- Google Analytics para user behavior
- Custom logging para métricas de negócio

---

## 15. DEPLOYMENT E DEVOPS

### 15.1 Ambientes

**Development:**
- Local com mock data
- Supabase local (docker)
- Variáveis em `.env.local`

**Staging:**
- Deploy em Vercel/Netlify/Cloudflare Pages
- Supabase staging project
- Testes de integração automatizados

**Production:**
- Deploy em Vercel/Netlify/Cloudflare Pages
- Supabase production project
- Monitoring 24/7
- Backups automáticos

### 15.2 CI/CD Pipeline

**GitHub Actions exemplo:**
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
```

**Deploy de Edge Functions:**
```bash
supabase functions deploy save-meme
supabase functions deploy get-user-memes
supabase functions deploy delete-meme
# ... outras funções
```

**Migrations:**
```bash
supabase db push  # Aplica migrations pendentes
```

### 15.3 Configuração de Secrets

**No Supabase Dashboard:**
- Acessar Functions → Secrets
- Adicionar cada secret necessário (TELEGRAM_BOT_TOKEN, etc)

**No Frontend (Vite):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Nunca commitar:**
- `.env`
- `.env.local`
- Tokens/passwords em código

### 15.4 Rollback Strategy

**Se deploy quebrar:**
1. Reverter commit no git
2. Redeploy automático via CI/CD
3. Ou: rollback manual via plataforma de hosting

**Database migrations:**
- Sempre criar migration de rollback junto com a migration
- Testar rollback em staging antes de produção

### 15.5 Escalabilidade

**Bottlenecks prováveis:**
- Database connections (aumentar pool size)
- Storage bandwidth (upgrade plan ou implementar CDN adicional)
- Edge function cold starts (considerar provisioned concurrency)

**Horizontal Scaling:**
- Edge functions escalma automaticamente
- Frontend é static (CDN cuida disso)
- Database: upgrade para plano maior ou read replicas

---

## 16. MELHORIAS E FEATURES FUTURAS

### 16.1 Features Sugeridas

**Editor Avançado:**
- Camadas editáveis (editar textos/imagens após adicionar)
- Undo/Redo
- Filtros e efeitos (blur, saturação, etc)
- Formas geométricas (círculos, retângulos)
- Stickers animados (GIFs)

**Social Features:**
- Comentários em memes
- Sistema de likes/dislikes
- Seguir outros usuários
- Feed público de memes populares
- Hashtags e busca

**Monetização:**
- Templates premium
- Assets exclusivos para assinantes
- Remoção de watermark
- Export em alta resolução

**Integrações:**
- Compartilhamento direto para Twitter, Instagram, Facebook
- Bot de Discord
- Plugin para WhatsApp
- API pública para desenvolvedores

### 16.2 Tech Debt a Resolver

**Código:**
- Refatorar MemeEditor (muito grande, quebrar em subcomponentes)
- Extrair lógica de canvas para custom hook separado
- Adicionar testes unitários (Jest + Testing Library)
- Adicionar testes E2E (Playwright)

**Infraestrutura:**
- Implementar monitoring proativo
- Setup de alertas (erros, latência alta)
- Documentação de runbooks (como resolver problemas comuns)

**Segurança:**
- Audit de dependências (npm audit)
- Penetration testing
- GDPR compliance (se aplicável)

### 16.3 Otimizações Futuras

**Performance:**
- Implementar Service Worker para offline support
- Precache de assets populares
- Lazy load de componentes não críticos

**UX:**
- Onboarding tutorial para novos usuários
- Tooltips explicativos
- Keyboard shortcuts
- Dark mode

---

## 17. CONSIDERAÇÕES FINAIS PARA RECONSTRUÇÃO

### 17.1 Ordem de Implementação Recomendada

**Fase 1: Fundação (1-2 semanas)**
1. Setup do projeto (Vite + React + TypeScript)
2. Configurar Tailwind CSS e componentes base
3. Criar estrutura de pastas e arquitetura
4. Setup do Supabase (projeto, database, storage)

**Fase 2: Autenticação (1 semana)**
1. Implementar sistema de autenticação multi-contexto
2. Criar edge functions de user management
3. Testar fluxos de auth em diferentes contextos

**Fase 3: Editor Básico (2-3 semanas)**
1. Implementar canvas com Fabric.js
2. Sistema de layers e templates
3. Manipulação de imagens e textos
4. Exportação de imagem

**Fase 4: Persistência (1-2 semanas)**
1. Edge function save-meme
2. Upload para storage
3. Edge function get-user-memes
4. Galeria básica

**Fase 5: Gamificação (1 semana)**
1. Sistema de pontos
2. Rankings
3. Badges
4. Stats display

**Fase 6: Polimento (1-2 semanas)**
1. Error handling robusto
2. Loading states
3. Validações completas
4. Otimizações de performance

**Fase 7: Deploy e Testes (1 semana)**
1. Setup de CI/CD
2. Deploy em produção
3. Testes de carga
4. Correções de bugs

### 17.2 Decisões Arquiteturais Importantes

**Monorepo vs Separate Repos:**
- Recomendado: **Monorepo** (frontend + backend no mesmo repo)
- Facilita compartilhamento de tipos e schemas
- Simplifica CI/CD

**State Management:**
- Para app pequeno: **useState + React Query** (suficiente)
- Para app grande: considerar **Zustand** ou **Redux Toolkit**

**Testing Strategy:**
- **Unit tests**: Funções utilitárias, validações
- **Integration tests**: Componentes complexos (Editor)
- **E2E tests**: Fluxos críticos (auth, save meme)
- Coverage target: 70%+

**Mobile Support:**
- **Responsive design** obrigatório (80%+ dos usuários em mobile)
- Considerar **PWA** para install prompt
- Touch gestures otimizados

### 17.3 Armadilhas Comuns a Evitar

❌ **Não otimizar prematuramente**
- Foque em funcionalidade primeiro
- Otimize depois de medir bottlenecks reais

❌ **Não ignorar edge cases**
- Usuário sem internet
- Imagem muito grande
- Textos com caracteres especiais

❌ **Não confiar cegamente no cliente**
- Sempre validar no backend
- Nunca expor tokens/secrets

❌ **Não negligenciar UX de erro**
- Sempre dar feedback claro ao usuário
- Oferecer recovery options

❌ **Não deixar código morto**
- Remover features não usadas
- Manter codebase limpo

### 17.4 Checklist Final Antes do Launch

**Funcionalidade:**
- [ ] Todos os fluxos principais funcionam
- [ ] Tratamento de erros implementado
- [ ] Loading states implementados
- [ ] Mobile responsivo

**Performance:**
- [ ] Lighthouse score 90+ (mobile e desktop)
- [ ] Bundle size <500KB gzipped
- [ ] TTI <3s em 3G
- [ ] Database queries otimizadas

**Segurança:**
- [ ] Validação frontend e backend
- [ ] Rate limiting implementado
- [ ] Secrets não expostos
- [ ] CORS configurado corretamente

**Monitoring:**
- [ ] Error tracking (Sentry)
- [ ] Analytics (GA4)
- [ ] Performance monitoring
- [ ] Alertas configurados

**Documentação:**
- [ ] README atualizado
- [ ] API docs (se pública)
- [ ] Runbooks para ops
- [ ] Changelog

---

## 18. GLOSSÁRIO

**Layer:** Elemento visual individual no canvas (imagem, texto, prop)

**Template:** Composição pré-definida de layers que forma um meme completo

**Short ID:** Identificador curto de 4-6 dígitos usado para compartilhamento de memes

**Idempotency Key:** String única usada para prevenir operações duplicadas

**Soft Delete:** Marcar registro como deletado sem removê-lo fisicamente do banco

**RLS (Row Level Security):** Sistema de permissões do PostgreSQL que filtra rows por usuário

**Edge Function:** Função serverless rodando em Deno no edge (próximo ao usuário)

**LRU Cache:** Cache que remove itens menos recentemente usados quando atinge limite

**Fabric.js:** Biblioteca JavaScript para manipulação de canvas HTML5

**WebApp:** Aplicação web integrada dentro de um app mobile (ex: Telegram MiniApp)

**CORS:** Mecanismo de segurança do navegador para controlar requests cross-origin

**Zod:** Biblioteca TypeScript de validação de schemas

---

## CONCLUSÃO

Este documento fornece uma visão completa e detalhada de todos os aspectos da aplicação Meme Maker, desde a arquitetura de alto nível até detalhes de implementação específicos. Ele foi projetado para servir como guia definitivo para um tech lead reconstruir a aplicação do zero, com foco em:

- **Clareza**: Cada seção explica O QUE fazer, não COMO fazer
- **Completude**: Todos os sistemas e fluxos estão documentados
- **Contexto**: Decisões arquiteturais são justificadas
- **Praticidade**: Exemplos conceituais e estruturas de dados fornecidos

A aplicação resultante será um Meme Maker robusto, escalável e de fácil manutenção, pronto para servir milhares de usuários criando e compartilhando memes diariamente.

---

**Documento gerado em:** 2025-10-01
**Versão:** 1.0
**Status:** Pronto para implementação