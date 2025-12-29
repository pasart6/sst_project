
import React, { useState } from 'react';
import { Column, Row } from '../types';
import { Plus, Trash2, Download, Copy, Filter, ChevronDown } from 'lucide-react';

interface SpreadsheetProps {
  columns: Column[];
  rows: Row[];
  onRowsChange: (rows: Row[]) => void;
  onColumnsChange: (columns: Column[]) => void;
}

export const Spreadsheet: React.FC<SpreadsheetProps> = ({
  columns,
  rows,
  onRowsChange,
  onColumnsChange,
}) => {
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);

  const addRow = () => {
    const newRow: Row = {
      id: crypto.randomUUID(),
      ...columns.reduce((acc, col) => ({ ...acc, [col.key]: col.type === 'number' ? 0 : '' }), {}),
    };
    onRowsChange([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  const updateCell = (rowId: string, colKey: string, value: any) => {
    const updatedRows = rows.map((r) => {
      if (r.id === rowId) {
        return { ...r, [colKey]: value };
      }
      return r;
    });
    onRowsChange(updatedRows);
  };

  const exportCSV = () => {
    const header = columns.map(c => c.label).join(',');
    const body = rows.map(r => columns.map(c => r[c.key]).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spreadsheet_export.csv';
    a.click();
  };

  const copyForSheets = () => {
    const body = rows.map(r => columns.map(c => r[c.key]).join('\t')).join('\n');
    navigator.clipboard.writeText(body);
    alert('Table data copied! You can now paste directly into Google Sheets.');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex space-x-2">
          <button
            onClick={addRow}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            <span>Add Row</span>
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={copyForSheets}
            className="flex items-center space-x-1 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            title="Copy as TSV for direct paste into Google Sheets"
          >
            <Copy size={16} />
            <span>Copy for Sheets</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center space-x-1 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-3 w-12"></th>
              {columns.map((col) => (
                <th key={col.key} className="p-3 text-sm font-semibold text-gray-600 min-w-[150px]">
                  <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <span>{col.label}</span>
                    <Filter size={14} className="text-gray-400" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                <td className="p-3 text-center">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
                {columns.map((col) => (
                  <td
                    key={`${row.id}-${col.key}`}
                    className="p-3 text-sm text-gray-700 cursor-text"
                    onClick={() => setEditingCell({ rowId: row.id, colKey: col.key })}
                  >
                    {editingCell?.rowId === row.id && editingCell?.colKey === col.key ? (
                      <input
                        autoFocus
                        type={col.type === 'number' ? 'number' : 'text'}
                        className="w-full p-1 border border-blue-500 rounded outline-none"
                        value={row[col.key]}
                        onBlur={() => setEditingCell(null)}
                        onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                      />
                    ) : (
                      <div className="min-h-[1.5rem]">
                        {row[col.key] || <span className="text-gray-300">...</span>}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-gray-400">
                  No data yet. Start by typing something in the Smart Input above!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
