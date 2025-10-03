# 🗿 CHAD MAKER - MANUAL DE DEPLOYMENT VPS

## 📋 STATUS DO PROJETO

✅ **Bot Telegram:** Criado e configurado  
✅ **Database Supabase:** Configurado com RLS  
✅ **Edge Functions:** Implementadas  
✅ **Secrets:** Configurados no Supabase  
✅ **Código:** Pronto para produção  
✅ **URLs:** Configuradas para chadmaker.click

---

## 🖥️ PRÉ-REQUISITOS DO VPS

### Servidor Ubuntu 22.04 com:
- **2GB RAM** (mínimo)
- **20GB SSD** 
- **Node.js 18+**
- **Nginx**
- **Certbot** (SSL)

### Domínio Configurado:
- `chadmaker.click` apontando para o IP do VPS
- DNS propagado (A record)

---

## 🚀 SETUP DO SERVIDOR

### 1. Atualizações e Dependências

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx build-essential

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

### 2. Configurar Firewall

```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status
```

### 3. Criar Estrutura de Diretórios

```bash
# Criar diretório para bots
sudo mkdir -p /opt/bots
sudo chown -R $USER:$USER /opt/bots
sudo chmod 755 /opt/bots
```

---

## 🔐 CONFIGURAR ACESSO AO GITHUB (REPOSITÓRIO PRIVADO)

Como o repositório https://github.com/DevGuipe/chad-maker-forge é privado, você precisa configurar autenticação:

### Opção 1: Token de Acesso Pessoal (Recomendado)

```bash
# 1. Criar token no GitHub:
# - Vá para: https://github.com/settings/tokens
# - Generate new token (classic)
# - Selecione escopo: repo (full control)
# - Copie o token gerado

# 2. Clonar usando token
git clone https://SEU_TOKEN@github.com/DevGuipe/chad-maker-forge.git chad-maker

# Exemplo:
# git clone https://ghp_1234567890abcdef@github.com/DevGuipe/chad-maker-forge.git chad-maker
```

### Opção 2: Chave SSH (Alternativa)

```bash
# 1. Gerar chave SSH (se não tiver)
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"

# 2. Adicionar chave ao ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. Copiar chave pública e adicionar no GitHub
cat ~/.ssh/id_ed25519.pub
# Cole em: https://github.com/settings/ssh/new

# 4. Clonar usando SSH
git clone git@github.com:DevGuipe/chad-maker-forge.git chad-maker
```

---

## 📁 DEPLOY DA APLICAÇÃO

### 1. Clone e Setup do Bot

```bash
# Navegar para diretório de bots
cd /opt/bots

# Clone do projeto (usando uma das opções acima)
git clone https://SEU_TOKEN@github.com/DevGuipe/chad-maker-forge.git chad-maker
cd chad-maker

# Instalar dependências
npm install

# Build de produção
npm run build

# Ajustar permissões para que o Nginx possa acessar
sudo chown -R $USER:www-data /opt/bots/chad-maker
sudo chmod -R 755 /opt/bots/chad-maker
```

---

## 🌐 CONFIGURAÇÃO DO NGINX

### 1. Arquivo de Configuração

```bash
sudo nano /etc/nginx/sites-available/chadmaker.click
```

**Conteúdo do arquivo:**

```nginx
server {
    listen 80;
    server_name chadmaker.click www.chadmaker.click;
    
    root /opt/bots/chad-maker/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=main:10m rate=10r/s;
    limit_req zone=main burst=20 nodelay;
}
```

### 2. Ativar Configuração

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/chadmaker.click /etc/nginx/sites-enabled/

# Remover site padrão se existir
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```
 
---

## 🔒 CONFIGURAR SSL

```bash
# Obter certificado SSL
sudo certbot --nginx -d chadmaker.click -d www.chadmaker.click

# Verificar renovação automática
sudo certbot renew --dry-run

# Configurar crontab para renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🤖 CONFIGURAR WEBHOOK DO TELEGRAM

Com o site funcionando em https://chadmaker.click, configure o webhook:

```bash
# Substitua SEU_TOKEN pelo token do seu bot
curl "https://api.telegram.org/botSEU_TOKEN/setWebhook?url=https://imyajbdqytdrefdnvgej.supabase.co/functions/v1/telegram-webhook"

# Verificar configuração
curl "https://api.telegram.org/botSEU_TOKEN/getWebhookInfo"
```

**Resposta esperada:**
```json
{
  "ok": true,
  "result": {
    "url": "https://imyajbdqytdrefdnvgej.supabase.co/functions/v1/telegram-webhook"
  }
}
```

---

## 🧪 TESTES COMPLETOS

### 1. Teste do Site
```bash
# Verificar se está no ar
curl -I https://chadmaker.click
# Deve retornar 200 OK

# Testar conteúdo
curl -s https://chadmaker.click | grep -i "CHAD Maker"
```

### 2. Teste do Bot
1. No Telegram, procure seu bot
2. Digite `/start`  
3. ✅ Deve aparecer botão "🗿 Open CHAD Maker"
4. ✅ Deve abrir https://chadmaker.click
5. ✅ WebApp deve carregar perfil do usuário

### 3. Teste Completo de Funcionalidade
1. **Criar meme:** Crie um meme no editor → salve na galeria
2. **Verificar pontos:** Deve dar +3 testosterone  
3. **Testar grupo:** Adicione bot a um grupo
4. **Publicar:** Use `/meme <ID>` para publicar
5. ✅ Deve mostrar meme com botões 👍😂
6. ✅ Reações devem dar +1 testosterone

---

## 📊 MONITORAMENTO

### Logs do Sistema
```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Status dos serviços
sudo systemctl status nginx
```

### Logs do Supabase Edge Function
**Acesse:** https://supabase.com/dashboard/project/imyajbdqytdrefdnvgej/functions/telegram-webhook/logs

### Verificar Espaço em Disco
```bash
# Verificar uso do disco
df -h

# Verificar tamanho da aplicação
du -sh /opt/bots/chad-maker
du -sh /var/www/chadmaker.click
```

---

## 🔄 DEPLOY DE ATUALIZAÇÕES

### 1. Script de Deploy

```bash
# Criar script de deploy
sudo nano /opt/bots/deploy-chadmaker.sh
```

**Conteúdo do script:**

```bash
#!/bin/bash

# Configurações
BOT_DIR="/opt/bots/chad-maker"
BACKUP_DIR="/opt/bots/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

echo "🗿 Starting CHAD Maker deployment..."

# Criar backup
mkdir -p $BACKUP_DIR
cp -r $BOT_DIR $BACKUP_DIR/chad-maker_$DATE

# Navegar para diretório do bot
cd $BOT_DIR

# Pull das mudanças
echo "📥 Pulling latest changes..."
git pull origin main

# Instalar dependências (se houver)
echo "📦 Installing dependencies..."
npm install

# Build
echo "🔨 Building application..."
npm run build

# Verificar se build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Build failed! Restoring backup..."
    rm -rf $BOT_DIR
    cp -r $BACKUP_DIR/chad-maker_$DATE $BOT_DIR
    exit 1
fi

# Ajustar permissões para o Nginx
echo "📋 Adjusting permissions..."
sudo chown -R $USER:www-data $BOT_DIR
sudo chmod -R 755 $BOT_DIR

# Testar configuração nginx
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx config error! Check configuration."
    exit 1
fi

# Reload nginx
echo "🔄 Reloading Nginx..."
sudo nginx -s reload

# Limpar backups antigos (manter últimos 5)
find $BACKUP_DIR -name "chad-maker_*" -type d | sort -r | tail -n +6 | xargs rm -rf

echo "✅ Deployment complete!"
echo "🌐 Site: https://chadmaker.click"
echo "📊 Logs: sudo tail -f /var/log/nginx/access.log"
```

### 2. Tornar Script Executável

```bash
# Permissões
sudo chmod +x /opt/bots/deploy-chadmaker.sh

# Fazer deploy
sudo /opt/bots/deploy-chadmaker.sh
```

---

## ⚠️ TROUBLESHOOTING

### Site não carrega
```bash
# 1. Verificar Nginx
sudo systemctl status nginx
sudo nginx -t

# Verificar arquivos
ls -la /opt/bots/chad-maker/dist/

# 3. Verificar logs
sudo tail -f /var/log/nginx/error.log

# 4. Verificar DNS
dig chadmaker.click
nslookup chadmaker.click
```

### SSL não funciona  
```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente se necessário
sudo certbot renew --force-renewal

# Verificar configuração SSL
sudo nginx -t
```

### Bot não responde
```bash
# Testar webhook
curl "https://api.telegram.org/botSEU_TOKEN/getWebhookInfo"

# Verificar se Edge Function está funcionando
curl -X POST "https://imyajbdqytdrefdnvgej.supabase.co/functions/v1/telegram-webhook" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
```

### Problemas de Permissão
```bash
# Corrigir permissões do diretório de bots
sudo chown -R $USER:www-data /opt/bots/chad-maker
sudo chmod -R 755 /opt/bots/chad-maker
```

---

## 🛡️ SEGURANÇA E MANUTENÇÃO

### 1. Backup Automático

```bash
# Criar script de backup
sudo nano /opt/bots/backup-chadmaker.sh
```

```bash
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/bots/backups"

mkdir -p $BACKUP_DIR

# Backup do código e build
tar -czf $BACKUP_DIR/chad-maker-complete_$DATE.tar.gz -C /opt/bots chad-maker

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $DATE"
```

```bash
# Tornar executável
sudo chmod +x /opt/bots/backup-chadmaker.sh

# Automatizar backup diário (2:00 AM)
sudo crontab -e
# Adicionar:
0 2 * * * /opt/bots/backup-chadmaker.sh
```

### 2. Fail2Ban (Proteção contra ataques)

```bash
# Instalar Fail2Ban
sudo apt install fail2ban

# Configurar
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10
```

```bash
# Ativar Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Verificar status
sudo fail2ban-client status
```

---

## ✅ CHECKLIST FINAL

**Infraestrutura:**
- [ ] **VPS Ubuntu 22.04 configurado**
- [ ] **Node.js 18+ instalado**  
- [ ] **Nginx configurado e funcionando**
- [ ] **SSL/HTTPS ativo (Let's Encrypt)**
- [ ] **Firewall configurado (UFW)**
- [ ] **Fail2Ban ativo**

**Aplicação:**
- [ ] **Código clonado em /opt/bots/chad-maker**
- [ ] **Build de produção gerado**
- [ ] **Arquivos servidos em /var/www/chadmaker.click**
- [ ] **DNS propagado (chadmaker.click)**
- [ ] **Site carregando em HTTPS**

**Bot e Funcionalidades:**
- [ ] **Webhook Telegram configurado**
- [ ] **Comando /start funcionando**
- [ ] **WebApp abrindo corretamente**
- [ ] **Criação de memes testada**
- [ ] **Publicação em grupos testada**
- [ ] **Sistema de reações funcionando**
- [ ] **Pontos de testosterone sendo dados**

**Manutenção:**
- [ ] **Script de deploy configurado**
- [ ] **Backups automáticos ativos**
- [ ] **Logs sendo monitorados**
- [ ] **Renovação SSL automática**

---

## 🚀 READY TO LAUNCH!

**Após completar o checklist, seu CHAD Maker estará rodando em produção!**

### 📁 Estrutura Final:
```
/opt/bots/chad-maker/          # Código fonte e build
/opt/bots/chad-maker/dist/     # Arquivos servidos pelo Nginx
/opt/bots/backups/             # Backups automáticos
/opt/bots/deploy-chadmaker.sh  # Script de deploy
```

### 🔗 URLs Importantes:
- **Site:** https://chadmaker.click
- **Supabase:** https://supabase.com/dashboard/project/imyajbdqytdrefdnvgej
- **Webhook:** https://imyajbdqytdrefdnvgej.supabase.co/functions/v1/telegram-webhook

### 📊 Comandos Úteis:
```bash
# Deploy atualização
sudo /opt/bots/deploy-chadmaker.sh

# Verificar logs
sudo tail -f /var/log/nginx/access.log

# Backup manual  
sudo /opt/bots/backup-chadmaker.sh

# Status geral
sudo systemctl status nginx
sudo fail2ban-client status
```

---

*🗿 CHAD Maker rodando em /opt/bots - Totalmente independente!*