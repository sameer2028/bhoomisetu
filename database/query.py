import os
import sys
import psycopg2
from dotenv import load_dotenv

# Try loading from backend/.env or ai-service/.env or root
for env_path in [
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", "ai-service", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_A4etUuqzx8Ep@ep-steep-hat-ayxde6gt-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
)

def format_table(headers, rows):
    if not rows:
        return "(0 rows)"
    
    str_rows = [[str(v) if v is not None else "NULL" for v in row] for row in rows]
    col_widths = [len(h) for h in headers]
    for row in str_rows:
        for i, val in enumerate(row):
            col_widths[i] = max(col_widths[i], len(val))
    
    # Header
    sep = "+" + "+".join("-" * (w + 2) for w in col_widths) + "+"
    header_str = "| " + " | ".join(f"{h:<{w}}" for h, w in zip(headers, col_widths)) + " |"
    
    lines = [sep, header_str, sep]
    for row in str_rows:
        lines.append("| " + " | ".join(f"{v:<{w}}" for v, w in zip(row, col_widths)) + " |")
    lines.append(sep)
    lines.append(f"({len(rows)} rows)")
    return "\n".join(lines)

def run_query(cur, sql):
    sql = sql.strip()
    if not sql:
        return
    
    # Meta commands like \dt
    if sql == r"\dt" or sql.lower() == "show tables":
        sql = "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    elif sql.startswith(r"\d "):
        tbl = sql.split()[1]
        sql = f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '{tbl}' ORDER BY ordinal_position;"

    cur.execute(sql)
    if cur.description:
        cols = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        print("\n" + format_table(cols, rows) + "\n")
    else:
        print("Query OK / Executed successfully.\n")

def main():
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        sys.exit(1)

    # If SQL query was passed via command-line arguments
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        try:
            run_query(cur, query)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            conn.close()
        return

    print("=" * 60)
    print(" Connected to Neon PostgreSQL Database")
    print(" Type SQL queries, \\dt (list tables), \\d <tbl>, or 'exit'")
    print("=" * 60)

    while True:
        try:
            cmd = input("bhoomisetu-db> ").strip()
            if not cmd:
                continue
            if cmd.lower() in ("exit", "quit", "\\q", "q"):
                print("Goodbye!")
                break
            run_query(cur, cmd)
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"SQL Error: {e}\n")

    conn.close()

if __name__ == "__main__":
    main()
