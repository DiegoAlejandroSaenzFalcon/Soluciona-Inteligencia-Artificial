# SSL Certificates

This directory should contain SSL certificates for production deployment.

## Required Files

```
ssl/
├── soluciona.ai.crt      # SSL certificate
├── soluciona.ai.key      # Private key
├── soluciona.ai.ca.crt   # CA certificate (optional)
└── dhparam.pem           # DH parameters for DHE ciphers
```

## Generating Certificates

### Option 1: Let's Encrypt (Recommended for Production)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone \
  -d soluciona.ai \
  -d www.soluciona.ai \
  -d api.soluciona.ai \
  -d auth.soluciona.ai \
  -d grafana.soluciona.ai \
  --email admin@soluciona.ai \
  --agree-tos \
  --no-eff-email

# Copy to this directory
sudo cp /etc/letsencrypt/live/soluciona.ai/fullchain.pem ssl/soluciona.ai.crt
sudo cp /etc/letsencrypt/live/soluciona.ai/privkey.pem ssl/soluciona.ai.key
sudo cp /etc/letsencrypt/live/soluciona.ai/chain.pem ssl/soluciona.ai.ca.crt

# Generate DH parameters
openssl dhparam -out ssl/dhparam.pem 2048
```

### Option 2: Self-Signed (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:2048 -nodes -keyout ssl/soluciona.ai.key \
  -out ssl/soluciona.ai.crt -days 365 \
  -subj "/C=CO/ST=Antioquia/L=Medellin/O=Soluciona IA/CN=soluciona.ai" \
  -addext "subjectAltName=DNS:soluciona.ai,DNS:www.soluciona.ai,DNS:api.soluciona.ai,DNS:auth.soluciona.ai,DNS:grafana.soluciona.ai"

# Generate DH parameters
openssl dhparam -out ssl/dhparam.pem 2048
```

### Option 3: Cloud Provider (AWS ACM, GCP SSL, Azure)

If using a cloud provider's managed certificates:

1. Request certificate in AWS Certificate Manager / Google Cloud SSL / Azure SSL
2. Attach to Application Load Balancer / Cloud Load Balancer
3. Nginx can terminate SSL at the load balancer level

## Production Checklist

- [ ] Certificates are valid and not expired
- [ ] Private key is secure (chmod 600)
- [ ] CA certificate included
- [ ] DH parameters generated (2048-bit minimum)
- [ ] OCSP Stapling enabled in Nginx
- [ ] HSTS header configured
- [ ] Certificate transparency logging enabled
- [ ] Auto-renewal configured (Let's Encrypt: certbot renew cron)

## File Permissions

```bash
chmod 600 ssl/soluciona.ai.key
chmod 644 ssl/soluciona.ai.crt
chmod 644 ssl/soluciona.ai.ca.crt
chmod 644 ssl/dhparam.pem
```

## Security Headers (Nginx)

The Nginx configuration includes:

```nginx
# Security headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# CSP
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.soluciona.ai wss://api.soluciona.ai; frame-ancestors 'self';" always;
```