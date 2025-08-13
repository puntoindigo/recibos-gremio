'use client';
import React from 'react';
import { ArchivoRecibo, parseArchivosCell, getArchivoLink } from '@/lib/archivos';

type Props = { value: unknown };

export default function ArchivosCell({ value }: Props) {
  const arr: ArchivoRecibo[] = parseArchivosCell(value);
  if (!arr.length) return <span>-</span>;

  return (
    <div className="flex flex-col gap-1">
      {arr.map((a) => {
        const link = getArchivoLink(a);
        return (
          <a key={(a.id || a.name)} href={link} target="_blank" rel="noopener noreferrer" className="underline">
            {a.name}
          </a>
        );
      })}
    </div>
  );
}
