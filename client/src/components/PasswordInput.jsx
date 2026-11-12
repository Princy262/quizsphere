import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// A password box with an eye button that shows or hides what you type
const PasswordInput = ({ name, value, onChange, placeholder }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-wrap">
      <input
        className="input"
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        className="eye-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </div>
  );
};

export default PasswordInput;