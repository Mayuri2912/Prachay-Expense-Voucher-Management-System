// The title block at the top of every page, with optional buttons on the right.

import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function PageHeader({ title, subtitle, backTo, backLabel = 'Back', children }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {backTo && (
          <Link to={backTo} className="back-link">
            <Icon name="arrow-left" size={16} />
            {backLabel}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </header>
  );
}
