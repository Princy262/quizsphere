import { Filter } from 'lucide-react';

// Dropdown with "All Categories" plus whatever categories exist
const CategoryFilter = ({ categories, value, onChange }) => {
  return (
    <div className="filter-box">
      <Filter size={17} />
      <select
        className="input select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategoryFilter;