// Sobe os emuladores locais do Firebase (Firestore, Auth e Hosting) no projeto
// "demo-rafatournament", que é isolado: nada aqui acessa o banco real do clube.
//
// Uso: npm run emuladores   →  site em http://127.0.0.1:5000  (painel em http://127.0.0.1:4000)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const env = { ...process.env };

// No Windows, o Java não consegue abrir sockets locais quando a pasta temporária
// tem espaços no caminho (ex.: C:\Users\Rafael Lopes\...). Usamos uma pasta sem espaços.
if (process.platform === 'win32') {
    const tmp = 'C:\\Users\\Public\\xadrez-emulador-tmp';
    mkdirSync(tmp, { recursive: true });
    env.JAVA_TOOL_OPTIONS = `-Djava.io.tmpdir=${tmp} -Djdk.net.unixdomain.tmpdir=${tmp}`;

    // Usa o JDK Temurin se o Java não estiver no PATH
    const adoptium = 'C:\\Program Files\\Eclipse Adoptium';
    if (!env.JAVA_HOME && existsSync(adoptium)) {
        const jdk = readdirSync(adoptium).filter(d => d.startsWith('jdk-')).sort().pop();
        if (jdk) {
            env.JAVA_HOME = path.join(adoptium, jdk);
            env.PATH = `${path.join(env.JAVA_HOME, 'bin')};${env.PATH}`;
        }
    }
}

const filho = spawn('firebase', ['emulators:start', '--project', 'demo-rafatournament'], {
    env, stdio: 'inherit', shell: true
});
filho.on('exit', codigo => process.exit(codigo ?? 0));
