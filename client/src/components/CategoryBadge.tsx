import React from 'react';
import { TicketCategory } from '../types/index.js';
import {
  Banknote,
  Barcode,
  Printer,
  Truck,
  BookOpen,
  HelpCircle
} from 'lucide-react';

interface CategoryBadgeProps {
  category: TicketCategory;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className = '' }) => {
  const getIcon = () => {
    switch (category) {
      case 'Royalty & Payments':
        return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
      case 'ISBN & Metadata Issues':
        return <Barcode className="w-3.5 h-3.5 text-indigo-600" />;
      case 'Printing & Quality':
        return <Printer className="w-3.5 h-3.5 text-amber-600" />;
      case 'Distribution & Availability':
        return <Truck className="w-3.5 h-3.5 text-sky-600" />;
      case 'Book Status & Production Updates':
        return <BookOpen className="w-3.5 h-3.5 text-purple-600" />;
      case 'General Inquiry':
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60 ${className}`}
    >
      {getIcon()}
      <span>{category}</span>
    </span>
  );
};
