'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ledgers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      type: {
        type: Sequelize.ENUM('CREDIT', 'DEBIT'),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false,
      },
      balanceBefore: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false,
        field: 'balance_before',
      },
      balanceAfter: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: false,
        field: 'balance_after',
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'COMPLETED', 'FAILED'),
        allowNull: false,
        defaultValue: 'COMPLETED',
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // Add indexes for common queries
    await queryInterface.addIndex('ledgers', ['wallet_id'], {
      name: 'ledgers_wallet_id_idx',
    });

    await queryInterface.addIndex('ledgers', ['wallet_id', 'created_at'], {
      name: 'ledgers_wallet_id_created_at_idx',
    });

    await queryInterface.addIndex('ledgers', ['reference'], {
      name: 'ledgers_reference_idx',
    });

    await queryInterface.addIndex('ledgers', ['type'], {
      name: 'ledgers_type_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ledgers');
  },
};
