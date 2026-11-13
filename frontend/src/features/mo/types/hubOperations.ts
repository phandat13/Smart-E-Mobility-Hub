export type Hub = {
  id: string;
  name: string;
  type: string;
  area: string;
  address: string;
  capacity: number;
  vehicles: number;
  chargers: number;
  activeChargers: number;
  status: string;
};
export type Charger = {
  id: string;
  connector: string;
  power: string;
  status: string;
  session: string;
};
export type Vehicle = { id: string; type: string; battery: number; hub: string; status: string };
