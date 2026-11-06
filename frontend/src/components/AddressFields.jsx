import { useProvinces } from '../hooks/useProvinces';
import { useWards } from '../hooks/useWards';
import ErrorState from './ErrorState';
import FormField, { fieldProps } from './FormField';

export default function AddressFields({ value, errors = {}, onChange }) {
  const provinces = useProvinces();
  const wards = useWards(value.provinceId);

  return (
    <>
      <FormField name="provinceId" label="Tỉnh/Thành" error={errors.provinceId}>
        {provinces.isError ? (
          <ErrorState message={provinces.error.message} onRetry={provinces.refetch} />
        ) : (
          <select
            {...fieldProps('provinceId', errors.provinceId)}
            value={value.provinceId}
            onChange={(e) => onChange({ provinceId: e.target.value, wardId: '' })}
          >
            <option value="">Chọn tỉnh/thành</option>
            {provinces.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </FormField>

      <FormField name="wardId" label="Phường/Xã" error={errors.wardId}>
        {wards.isError ? (
          <ErrorState message={wards.error.message} onRetry={wards.refetch} />
        ) : (
          <select
            {...fieldProps('wardId', errors.wardId)}
            value={value.wardId}
            disabled={!value.provinceId}
            onChange={(e) => onChange({ wardId: e.target.value })}
          >
            <option value="">Chọn phường/xã</option>
            {wards.data?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
      </FormField>

      <FormField name="street" label="Số nhà, tên đường" error={errors.street}>
        <input
          type="text"
          autoComplete="street-address"
          {...fieldProps('street', errors.street)}
          value={value.street}
          onChange={(e) => onChange({ street: e.target.value })}
        />
      </FormField>
    </>
  );
}
