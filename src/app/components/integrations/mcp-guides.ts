export type McpGuideId = 'chatgpt' | 'claude' | 'codex';

export interface McpGuide {
  id: McpGuideId;
  name: string;
  requirements: string;
  steps: readonly { title: string; text: string }[];
  sourceUrl: string;
  reviewedOn: string;
  terminalCommands?: readonly string[];
}

export const MCP_SERVER_URL = 'https://api.katuq.com/mcp';

/** Contenido editorial local: leer una guía no inicia una conexión ni consulta al servidor. */
export const MCP_GUIDES: Readonly<Record<McpGuideId, McpGuide>> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    requirements: 'Necesitas una cuenta de Katuq y acceso para añadir servidores MCP personalizados en ChatGPT. Si no aparece esa opción, consulta los permisos de tu espacio de trabajo con su administrador.',
    steps: [
      { title: 'Abre los plugins de ChatGPT', text: 'En ChatGPT web, abre Plugins. Pulsa el botón + y elige «Add custom MCP server» o «Añadir servidor MCP personalizado».' },
      { title: 'Añade Katuq', text: 'Escribe Katuq como nombre y pega la dirección de este instructivo. Selecciona OAuth para iniciar sesión con tu cuenta; no necesitas una clave API.' },
      { title: 'Autoriza tu cuenta', text: 'Completa el inicio de sesión en la página de Katuq que se abre y revisa el acceso solicitado. Después, termina de crear e instalar el plugin en ChatGPT.' },
      { title: 'Úsalo en una conversación', text: 'Abre un chat, escribe @ y selecciona Katuq. Haz una pregunta de consulta, por ejemplo: «Muéstrame mis ventas de hoy». La respuesta depende de los permisos de tu usuario.' },
    ],
    sourceUrl: 'https://developers.openai.com/plugins/build/app-quickstart',
    reviewedOn: '20 de octubre de 2026',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    requirements: 'Necesitas una cuenta de Katuq y acceso a conectores personalizados en Claude. En Team o Enterprise, el propietario de la organización puede tener que añadir el conector primero.',
    steps: [
      { title: 'Abre los conectores', text: 'En Claude, entra en Personalizar → Conectores. Elige «Añadir» y «Añadir conector personalizado». En una organización, su propietario lo añade desde Configuración de la organización → Conectores.' },
      { title: 'Indica la dirección', text: 'Escribe Katuq como nombre y pega la dirección de este instructivo. Continúa con la autenticación de inicio de sesión detectada por Claude.' },
      { title: 'Inicia sesión en Katuq', text: 'Elige iniciar sesión y autoriza con tu propia cuenta de Katuq en la página que se abre. Si Claude pide cómo registrar el cliente OAuth, utiliza el registro automático. No pegues una clave API ni tu contraseña en el chat.' },
      { title: 'Habilítalo en el chat', text: 'En una conversación, abre + → Conectores y activa Katuq. Prueba con «Muéstrame mis tickets de soporte» o una consulta que tu usuario tenga autorizada.' },
    ],
    sourceUrl: 'https://support.claude.com/es/articles/11175166-comienza-con-conectores-personalizados-usando-mcp-remoto',
    reviewedOn: '20 de octubre de 2026',
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    requirements: 'Necesitas una cuenta de Katuq y una versión de Codex que permita servidores MCP remotos con OAuth. Las políticas de tu organización pueden limitar qué servidores puedes añadir.',
    steps: [
      { title: 'Abre la configuración MCP', text: 'En la aplicación, abre Ajustes → Servidores MCP y elige Añadir servidor. En la extensión del editor, abre el menú del engranaje → MCP servers → Add server.' },
      { title: 'Añade el servidor remoto', text: 'Escribe katuq como nombre, selecciona Streamable HTTP y pega la dirección de este instructivo. Guarda y reinicia la aplicación o extensión cuando te lo pida.' },
      { title: 'Autentica tu cuenta', text: 'En la lista de servidores, pulsa Authenticate o Autenticar junto a Katuq. Completa el inicio de sesión en la página de Katuq con tu propia cuenta.' },
      { title: 'Comprueba la conexión', text: 'Abre una conversación y pide «Consulta mis ventas de hoy usando Katuq». Si usas la terminal, /mcp muestra los servidores disponibles.' },
    ],
    terminalCommands: [
      'codex mcp add katuq --url https://api.katuq.com/mcp',
      'codex mcp login katuq',
    ],
    sourceUrl: 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli',
    reviewedOn: '20 de octubre de 2026',
  },
};
