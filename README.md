# wallet-service

#### Clone the repository

```bash
git clone https://github.com/communcom/wallet.git
cd wallet
```

#### Create .env file

```bash
cp .env.example .env
```

Add variables
```bash
GLS_BLOCKCHAIN_BROADCASTER_CONNECT=nats://user:password@ip:4222
```

#### Create docker-compose file

```bash
cp docker-compose.example.yml docker-compose.yml 
```

#### Run

```bash
docker-compose up -d --build
```