from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from datetime import datetime

app = Flask(__name__)
CORS(app) 

# ============================================================
# SUPABASE / POSTGRESQL
# ============================================================
# Configure estas variáveis no Render (ou no seu ambiente local):
#
# DATABASE_URL=postgresql://postgres:SENHA@db.PROJETO.supabase.co:5432/postgres
#
# O código também aceita as variáveis separadas abaixo, caso prefira:
# SUPABASE_DB_HOST
# SUPABASE_DB_NAME
# SUPABASE_DB_USER
# SUPABASE_DB_PASSWORD
# SUPABASE_DB_PORT
#
# NUNCA coloque a senha do Supabase diretamente neste arquivo.
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DB_CONFIG = {"dsn": DATABASE_URL}
else:
    DB_CONFIG = {
        "host": os.getenv("SUPABASE_DB_HOST"),
        "database": os.getenv("SUPABASE_DB_NAME", "postgres"),
        "user": os.getenv("SUPABASE_DB_USER", "postgres"),
        "password": os.getenv("SUPABASE_DB_PASSWORD"),
        "port": os.getenv("SUPABASE_DB_PORT", "5432"),
        "sslmode": os.getenv("SUPABASE_DB_SSLMODE", "require")
    }

passou_limite_global = False


@app.route('/health')
def health():
    """Verifica se a API está funcionando e se consegue acessar o Supabase."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT current_database(), current_user")
        db_name, db_user = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({
            "status": "ok",
            "database": db_name,
            "user": db_user,
            "supabase": True
        })
    except Exception as e:
        if conn:
            conn.close()
        return jsonify({
            "status": "erro",
            "supabase": False,
            "erro": str(e)
        }), 500

@app.route('/dados_atuais')
def dados_atuais():
    global passou_limite_global
    conn = None
    try:
        limite_usuario = float(request.args.get('limite', 14080))
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        cur.execute("SELECT potencia_watts FROM leituras_energia ORDER BY data_hora DESC LIMIT 1")
        res = cur.fetchone()
        potencia = float(res[0]) if res else 0.0
        
        if potencia > limite_usuario:
            if not passou_limite_global:
                cur.execute(
                    "INSERT INTO historico_alertas (potencia_watts, limite_definido) VALUES (%s, %s)",
                    (potencia, limite_usuario)
                )
                conn.commit()
                passou_limite_global = True
        else:
            passou_limite_global = False


@app.route('/health')
def health():
    """Verifica se a API está funcionando e se consegue acessar o Supabase."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT current_database(), current_user")
        db_name, db_user = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({
            "status": "ok",
            "database": db_name,
            "user": db_user,
            "supabase": True
        })
    except Exception as e:
        if conn:
            conn.close()
        return jsonify({
            "status": "erro",
            "supabase": False,
            "erro": str(e)
        }), 500

        cur.execute("SELECT SUM(potencia_watts / 1000.0 * (2.0 / 3600.0)) FROM leituras_energia WHERE data_hora::date = current_date")
        res_energia = cur.fetchone()
        energia_dia = float(res_energia[0]) if res_energia and res_energia[0] is not None else 0.0
        
        cur.execute("SELECT MAX(potencia_watts) FROM leituras_energia WHERE data_hora::date = current_date")
        res_pico = cur.fetchone()
        pico_dia = float(res_pico[0]) if res_pico and res_pico[0] is not None else 0.0
        
        cur.execute("SELECT COUNT(*) FROM historico_alertas WHERE data_hora::date = current_date")
        alertas_hoje = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            "potencia": round(potencia, 2),
            "energiaDia": round(energia_dia, 3),
            "picoDia": round(pico_dia, 2),
            "alertasHoje": alertas_hoje
        })
    except Exception as e:
        print(f"Erro em dados_atuais: {e}")
        if conn: conn.close()
        return jsonify({"erro": str(e)}), 500

@app.route('/historico_diario')
def historico_diario():
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                c.data_ref,
                c.consumo_kwh,
                COALESCE(a.total_alertas, 0) as alertas_do_dia
            FROM (
                SELECT data_hora::date as data_ref, ROUND(SUM(potencia_watts / 1000.0 * (2.0 / 3600.0)), 2) as consumo_kwh
                FROM leituras_energia GROUP BY data_ref
            ) c
            LEFT JOIN (
                SELECT data_hora::date as data_ref, COUNT(*) as total_alertas
                FROM historico_alertas GROUP BY data_ref
            ) a ON c.data_ref = a.data_ref
            ORDER BY c.data_ref DESC
            LIMIT 7
        """)
        dados = cur.fetchall()
        cur.close()
        conn.close()
        
        dados_invertidos = list(reversed(dados))
        valores = [float(d[1]) for d in dados_invertidos]
        media_7_dias = sum(valores) / len(valores) if valores else 0.0
        
        return jsonify({
            "labels": [d[0].strftime("%d/%m") for d in dados_invertidos],
            "valores": valores,
            "alertas": [int(d[2]) for d in dados_invertidos],
            "media": round(media_7_dias, 2)
        })
    except Exception as e:
        print(f"Erro no histórico diário: {e}")
        if conn: conn.close()
        return jsonify({"labels": [], "valores": [], "alertas": [], "media": 0.0})

@app.route('/historico_mensal')
def historico_mensal():
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                to_char(data_hora, 'MM/YYYY') as mes_ref,
                ROUND(SUM(potencia_watts / 1000.0 * (2.0 / 3600.0)), 2) as consumo_kwh,
                EXTRACT(YEAR FROM data_hora) as ano,
                EXTRACT(MONTH FROM data_hora) as mes
            FROM leituras_energia
            GROUP BY mes_ref, ano, mes
            ORDER BY ano ASC, mes ASC
        """)
        dados = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"labels": [d[0] for d in dados], "valores": [float(d[1]) for d in dados]})
    except Exception as e:
        if conn: conn.close()
        return jsonify({"labels": [], "valores": []}), 500


# SOLUÇÃO REQUISITOS 1, 2, 3 e 4: Nova Rota de Filtro Combinado Ano e Mês
@app.route('/filtrar_avancado')
def filtrar_avancado():
    conn = None
    try:
        ano = request.args.get('ano')
        mes = request.args.get('mes') # Pode vir vazio ou None
        
        if not ano:
            return jsonify({"erro": "O parâmetro 'ano' é obrigatório"}), 400
            
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Caso A: Usuário filtrou APENAS o Ano (Mês está em branco/Todos)
        if not mes or mes == "":
            cur.execute("""
                SELECT 
                    to_char(data_hora, 'MM/YYYY') as mes_ref,
                    ROUND(SUM(potencia_watts / 1000.0 * (2.0 / 3600.0)), 2) as consumo_kwh
                FROM leituras_energia
                WHERE EXTRACT(YEAR FROM data_hora) = %s
                GROUP BY mes_ref, EXTRACT(MONTH FROM data_hora)
                ORDER BY EXTRACT(MONTH FROM data_hora) ASC
            """, (int(ano),))
            dados = cur.fetchall()
            
            labels = [d[0] for d in dados]
            valores = [float(d[1]) for d in dados]
            # Média de todos os meses retornados desse ano específico
            media = round(sum(valores) / len(valores), 2) if valores else 0.0
            
        # Caso B: Usuário filtrou Ano E Mês juntos
        else:
            cur.execute("""
                SELECT 
                    to_char(data_hora, 'MM/YYYY') as mes_ref,
                    ROUND(SUM(potencia_watts / 1000.0 * (2.0 / 3600.0)), 2) as consumo_kwh
                FROM leituras_energia
                WHERE EXTRACT(YEAR FROM data_hora) = %s AND EXTRACT(MONTH FROM data_hora) = %s
                GROUP BY mes_ref
            """, (int(ano), int(mes)))
            res = cur.fetchone()
            
            if res:
                # Formata a string do mês selecionado com preenchimento de zeros à esquerda (ex: 04/2026)
                mes_str = f"{int(mes):02d}/{ano}"
                labels = [mes_str]
                valores = [float(res[1])]
                media = float(res[1]) # Se é só um mês, a média dele é o próprio valor
            else:
                mes_str = f"{int(mes):02d}/{ano}"
                labels = [mes_str]
                valores = [0.0]
                media = 0.0

        cur.close()
        conn.close()
        
        return jsonify({
            "labels": labels,
            "valores": valores,
            "media": media
        })
    except Exception as e:
        print(f"Erro na filtragem avançada: {e}")
        if conn: conn.close()
        return jsonify({"labels": [], "valores": [], "media": 0.0, "erro": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)