import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadDatabaseSettings } from '../config/database-config';
import { databaseOptions } from './database-options';

// CLI initialization must never synchronize schema or log sensitive parameters.
export default new DataSource({
  ...databaseOptions(loadDatabaseSettings()),
  synchronize: false,
  logging: false,
});
