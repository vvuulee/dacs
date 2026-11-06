import { useState } from 'react';
import FormField, { fieldProps } from './FormField';
import styles from './PasswordField.module.css';

export default function PasswordField({ name, label, value, onChange, error, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField name={name} label={label} error={error}>
      <div className={styles.wrap}>
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...fieldProps(name, error)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" className={styles.toggle} onClick={() => setVisible((v) => !v)}>
          <span className={styles.srOnly}>{`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`}</span>
          <span aria-hidden="true">{visible ? 'Ẩn' : 'Hiện'}</span>
        </button>
      </div>
    </FormField>
  );
}
