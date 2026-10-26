"""Un mensaje básico real de ADK/MCP, con modelo y billing falsos. Solo loopback."""
import asyncio
import json
import pathlib
import sys
import types as module_types
from unittest.mock import patch

root = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(root))
for name in ('services', 'tools', 'endpoints', 'config'):
    package = module_types.ModuleType(name)
    package.__path__ = [str(root / name)]
    sys.modules[name] = package

from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_response import LlmResponse
from google.genai import types
from pydantic import Field
from endpoints import katuq_basic_chat_endpoint as basic
from services.katuq_access_policy import katuq_request


class FixtureModel(BaseLlm):
    model: str = 'offline-cross-repo-support'
    turn: int = 0
    captured: list = Field(default_factory=list)
    async def generate_content_async(self, llm_request, stream=False):
        self.captured.append(str(llm_request.contents) + str(llm_request.config.system_instruction))
        part = types.Part(function_call=types.FunctionCall(name='create_support_ticket', id='report-1', args={
            'asunto': 'Error al guardar factura', 'descripcion': 'La pantalla muestra un error al guardar la factura.', 'adjuntos': []})) \
            if self.turn == 0 else types.Part(text='Revisa el reporte y pulsa Crear ticket si estás de acuerdo.')
        self.turn += 1
        yield LlmResponse(content=types.Content(role='model', parts=[part]))


async def main():
    payload = json.loads(sys.stdin.read())
    model = FixtureModel()
    billing = module_types.SimpleNamespace(_get_db=lambda: None,
        check_credit_quota=lambda *a, **k: {'allowed': True}, consume_credit=lambda *a: None)
    real_run = basic.run_basic_query
    private_admissions = []
    async def run(*args, **kwargs):
        private_admissions.append(katuq_request.get()['admission'])
        return await real_run(*args, model=model, **kwargs)
    request = basic.BasicChatRequest(company='A', messages=[{'role': 'user', 'content': 'Quiero reportar que no puedo guardar una factura.'}])
    with patch.object(basic, 'run_basic_query', run), patch.dict(sys.modules, {'endpoints.billing_endpoint': billing}):
        response = await basic.basic_chat(request, module_types.SimpleNamespace(headers={'authorization': 'Bearer ' + payload['token']}))
        frames = [json.loads(frame.removeprefix('data: ').strip()) async for frame in response.body_iterator]
    captured = '\n'.join(model.captured)
    card = next((frame.get('proposal') for frame in frames if frame['type'] == 'katuq:SUPPORT_PROPOSAL'), None)
    leak = any(secret in captured for secret in [payload['token'], 'GENERIC_RECEIPT_SENTINEL',
        (card or {}).get('confirmationToken', 'never-match'), *private_admissions])
    # stdout es el transporte privado del fixture hacia Node; no se registra su contenido.
    print(json.dumps({'frames': frames, 'modelCalls': model.turn, 'leak': leak}))


asyncio.run(main())
