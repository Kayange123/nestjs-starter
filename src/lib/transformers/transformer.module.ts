import { Module, Global } from '@nestjs/common';

import { ResponseTransformer } from 'src/lib/transformers/response.transformer';

@Global()
@Module({
  providers: [ResponseTransformer],
  exports: [ResponseTransformer],
})
export class TransformerModule {}
