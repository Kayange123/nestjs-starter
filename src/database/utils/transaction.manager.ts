import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * TransactionManager provides utilities for handling database transactions
 * with proper error handling and rollback support.
 */
@Injectable()
export class TransactionManager {
  constructor(private dataSource: DataSource) {}

  /**
   * Execute operations within a transaction with automatic commit/rollback
   *
   * @param operation Function containing database operations to execute within transaction
   * @returns Result of the operation function
   */
  async executeInTransaction<T>(
    operation: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute operations with a manually managed transaction
   * Useful for more complex transaction scenarios
   *
   * @param operation Function with custom transaction logic using queryRunner
   * @returns Result of the operation function
   */
  async withTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
