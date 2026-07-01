import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { BestSellersQueryDto } from './dto/best-sellers-query.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { PaginatedProductsDto, ProductResponseDto } from './dto/product-response.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Public() // the catalog is public; all read endpoints are open
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List active products (search / filter / sort / paginate)' })
  @ApiOkResponse({ type: PaginatedProductsDto })
  findMany(@Query() query: ProductQueryDto): Promise<PaginatedProductsDto> {
    return this.productsService.findMany(query);
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'List active best-selling products from real paid orders' })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  bestSellers(@Query() query: BestSellersQueryDto): Promise<ProductResponseDto[]> {
    return this.productsService.findBestSellers(query.limit, query.windowDays);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single active product' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found or inactive' })
  findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }
}
