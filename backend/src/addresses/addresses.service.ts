import { Injectable, NotFoundException } from '@nestjs/common';
import { Address, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponseDto, toAddressResponse } from './dto/address-response.dto';

// Default first, then newest — gives the storefront a stable "use my default" ordering.
const ADDRESS_ORDER = [
  { isDefault: 'desc' },
  { createdAt: 'desc' },
] satisfies Prisma.AddressOrderByWithRelationInput[];

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  // Every method takes the JWT-derived userId and filters by it. The client never supplies a
  // userId, and by-id lookups are scoped to { id, userId } so another user's row reads as 404 —
  // existence is never leaked (no IDOR).

  /** The authenticated user's addresses, default first then newest. */
  async list(userId: string): Promise<AddressResponseDto[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: ADDRESS_ORDER,
    });
    return addresses.map(toAddressResponse);
  }

  /**
   * Create an address. It becomes the default when the caller asks for it OR when it's the user's
   * very first address (so a user always has exactly one default). Making one default unsets any
   * other in the same transaction, preserving the single-default invariant.
   */
  async create(userId: string, dto: CreateAddressDto): Promise<AddressResponseDto> {
    const created = await this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.address.count({ where: { userId } });
      const isDefault = dto.isDefault === true || existingCount === 0;

      if (isDefault) {
        await this.unsetDefaults(tx, userId);
      }
      return tx.address.create({
        data: {
          userId,
          label: dto.label,
          fullName: dto.fullName,
          line1: dto.line1,
          line2: dto.line2 ?? null,
          city: dto.city,
          postcode: dto.postcode,
          country: dto.country,
          isDefault,
        },
      });
    });
    return toAddressResponse(created);
  }

  /**
   * Update an owned address (404 if it isn't theirs). When the patch sets isDefault=true, any
   * other default is unset in the same transaction. We never let a user clear their last default
   * via isDefault=false here — that's only meaningful through promotion on delete or setDefault.
   */
  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<AddressResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.requireOwned(tx, userId, id);

      if (dto.isDefault === true) {
        await this.unsetDefaults(tx, userId, id);
      }
      const data: Prisma.AddressUpdateInput = {};
      if (dto.label !== undefined) data.label = dto.label;
      if (dto.fullName !== undefined) data.fullName = dto.fullName;
      if (dto.line1 !== undefined) data.line1 = dto.line1;
      if (dto.line2 !== undefined) data.line2 = dto.line2;
      if (dto.city !== undefined) data.city = dto.city;
      if (dto.postcode !== undefined) data.postcode = dto.postcode;
      if (dto.country !== undefined) data.country = dto.country;
      if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

      return tx.address.update({ where: { id }, data });
    });
    return toAddressResponse(updated);
  }

  /** Mark one owned address as the default and unset all others (404 if not theirs). */
  async setDefault(userId: string, id: string): Promise<AddressResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.requireOwned(tx, userId, id);
      await this.unsetDefaults(tx, userId, id);
      return tx.address.update({ where: { id }, data: { isDefault: true } });
    });
    return toAddressResponse(updated);
  }

  /**
   * Delete an owned address (404 if not theirs). If it was the default and others remain, promote
   * the newest remaining address to default so the single-default invariant survives. Choice: the
   * newest remaining is the most likely to be the user's current address; it's deterministic and
   * needs no extra input. Returns the user's remaining addresses (matching cart's list-returning
   * convention) so the client can refresh in one round-trip.
   */
  async remove(userId: string, id: string): Promise<AddressResponseDto[]> {
    await this.prisma.$transaction(async (tx) => {
      const address = await this.requireOwned(tx, userId, id);
      await tx.address.delete({ where: { id } });

      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });
    return this.list(userId);
  }

  // --- helpers ---------------------------------------------------------------------

  /** Fetch an address scoped to its owner, or 404. Scoping by userId prevents IDOR. */
  private async requireOwned(
    client: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<Address> {
    const address = await client.address.findFirst({ where: { id, userId } });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  /** Clear isDefault on all of the user's addresses, optionally except one. */
  private async unsetDefaults(
    client: Prisma.TransactionClient,
    userId: string,
    exceptId?: string,
  ): Promise<void> {
    await client.address.updateMany({
      where: {
        userId,
        isDefault: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }
}
