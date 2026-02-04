'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transaction_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      idempotencyKey: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        field: 'idempotency_key',
      },
      operation: {
        type: Sequelize.ENUM('CREDIT', 'DEBIT', 'TRANSFER'),
        allowNull: false,
      },
      walletId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'wallet_id',
        references: {
          model: 'wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'COMPLETED', 'FAILED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    });

    // Add indexes
    await queryInterface.addIndex('transaction_logs', ['idempotency_key'], {
      name: 'transaction_logs_idempotency_key_unique',
      unique: true,
    });

    await queryInterface.addIndex('transaction_logs', ['wallet_id', 'status'], {
      name: 'transaction_logs_wallet_id_status_idx',
    });

    await queryInterface.addIndex('transaction_logs', ['created_at'], {
      name: 'transaction_logs_created_at_idx',
    });

    // Add transactionLogId column to ledgers table
    await queryInterface.addColumn('ledgers', 'transaction_log_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'transaction_logs',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('ledgers', ['transaction_log_id'], {
      name: 'ledgers_transaction_log_id_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key and index from ledgers
    await queryInterface.removeIndex('ledgers', 'ledgers_transaction_log_id_idx');
    await queryInterface.removeColumn('ledgers', 'transaction_log_id');

    // Drop transaction_logs table
    await queryInterface.dropTable('transaction_logs');
  },
};
