import json
with open('google_cliente.json', 'r') as archivo:
    datos = json.load(archivo)
    json_escapado = json.dumps(datos)
    print(json_escapado)