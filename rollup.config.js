import typescript from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy';

export default {
    input: 'src/app.ts',
    output: {
        file: 'dist/app.js',
        format: 'esm',
    },
    onwarn: (warning) => {
        if (warning.code === 'UNRESOLVED_IMPORT') return;
    },
    plugins: [
        typescript(),
        copy({
            targets: [
                { src: 'src/info.txt', dest: 'dist' }  // Copia el archivo info.txt a dist/src
            ]
        })
    ],
};
