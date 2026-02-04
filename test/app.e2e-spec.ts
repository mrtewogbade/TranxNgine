import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Wallet System (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Wallet Operations', () => {
    let walletId: string;

    it('POST /wallets - should create a wallet', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallets')
        .send({
          userId: 'e2e-user-1',
          initialBalance: '100.00',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('e2e-user-1');
      expect(response.body.data.balance).toBe('100.00');
      
      walletId = response.body.data.id;
    });

    it('GET /wallets/:id - should get wallet by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/wallets/${walletId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(walletId);
    });

    it('POST /wallets/:id/credit - should credit wallet', async () => {
      const response = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/credit`)
        .send({
          amount: '50.00',
          description: 'E2E test credit',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('CREDIT');
      expect(response.body.data.balanceAfter).toBe('150.00');
    });

    it('POST /wallets/:id/debit - should debit wallet', async () => {
      const response = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/debit`)
        .send({
          amount: '25.00',
          description: 'E2E test debit',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('DEBIT');
      expect(response.body.data.balanceAfter).toBe('125.00');
    });

    it('GET /wallets/:id/transactions - should get transaction history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/wallets/${walletId}/transactions`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Cases', () => {
    it('POST /wallets/:id/debit - should prevent overdraft', async () => {
      const wallet = await request(app.getHttpServer())
        .post('/wallets')
        .send({
          userId: 'e2e-user-insufficient',
          initialBalance: '10.00',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/wallets/${wallet.body.data.id}/debit`)
        .send({
          amount: '100.00',
        })
        .expect(400);
    });
  });
});
