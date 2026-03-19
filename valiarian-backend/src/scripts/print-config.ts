import {ValiarianDataSource} from '../datasources';

async function printConfig() {
  console.log('Database Config:');
  console.log('Host:', ValiarianDataSource.defaultConfig.host);
  console.log('Port:', ValiarianDataSource.defaultConfig.port);
  console.log('Database:', ValiarianDataSource.defaultConfig.database);
  console.log('User:', ValiarianDataSource.defaultConfig.user);
  process.exit(0);
}

printConfig().catch(err => {
  console.error(err);
  process.exit(1);
});
