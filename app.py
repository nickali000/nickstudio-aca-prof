import os

from flask import Flask, jsonify, redirect, render_template, url_for


app = Flask(__name__)


@app.route("/")
def index():
    return redirect(url_for("table_trainer"))


@app.route("/advanced-computer-architectures/exercises/table-trainer")
def table_trainer():
    return render_template("aca_table_trainer.html")


@app.route("/favicon.ico")
def favicon():
    return ("", 204)


@app.route("/healthz")
def healthz():
    return jsonify(status="ok")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("NICKSTUDIO_PORT", "8085")))
    debug = os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true", "yes", "on")
    app.run(host="0.0.0.0", port=port, debug=debug)
