const ADDRESS_KEY = "smartcube-address";

/** A Bluetooth address you typed in, for cubes (some QiYi ones) whose address Chrome can't read by itself. */
export function savedAddress(): string | null {
  try {
    return localStorage.getItem(ADDRESS_KEY);
  } catch {
    return null;
  }
}

export function saveAddress(address: string) {
  try {
    if (address) localStorage.setItem(ADDRESS_KEY, address.trim().toUpperCase());
    else localStorage.removeItem(ADDRESS_KEY);
  } catch {
    // Private windows can block storage; the cube just won't remember the address.
  }
}
