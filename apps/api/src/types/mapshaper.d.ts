// У mapshaper нет типов; нужен только applyCommands (см. scripts/import-regions.ts).
declare module 'mapshaper' {
  const mapshaper: {
    applyCommands(
      commands: string,
      input: Record<string, unknown>,
    ): Promise<Record<string, string | Uint8Array>>;
  };
  export default mapshaper;
}
