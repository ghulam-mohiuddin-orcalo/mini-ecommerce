import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

/** Customer address book: auth-scoped CRUD with a single-default-per-user invariant. */
@Module({
  imports: [PrismaModule],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService], // checkout can reuse this to resolve a shipping address
})
export class AddressesModule {}
