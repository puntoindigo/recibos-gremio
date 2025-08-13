export type DiffItem = {
  codigo: string;
  label: string;
  oficial: string;   // toFixed(2)
  calculado: string; // toFixed(2)
  delta: string;     // toFixed(2)
  dir: "a favor" | "en contra";
};

export type ControlSummary = {
  key: string;
  legajo: string;
  periodo: string;
  difs: DiffItem[]; // solo las que superan tolerancia
};
