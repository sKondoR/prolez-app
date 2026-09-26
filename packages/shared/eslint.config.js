import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  // Без явного корня typescript-eslint угадывает его по стеку вызовов и в VS Code, где конфиги
  // api и shared грузятся в одном процессе, падает с «multiple candidate TSConfigRootDirs».
  languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
});
