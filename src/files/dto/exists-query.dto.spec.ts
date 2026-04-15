import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ExistsQueryDto } from './exists-query.dto';

describe('ExistsQueryDto', () => {
  it('passes with one id', async () => {
    const dto = plainToInstance(ExistsQueryDto, { ids: ['abc123'] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails with empty ids array', async () => {
    const dto = plainToInstance(ExistsQueryDto, { ids: [] });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('normalises single string to array via @Transform', async () => {
    const dto = plainToInstance(ExistsQueryDto, { ids: 'abc123' });
    expect(dto.ids).toEqual(['abc123']);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
