import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { assessmentId } = await req.json();

    // 🔹 Aqui depois vamos buscar dados no banco
    const fakeData = {
      name: "Carlos",
      score: 85,
      result: "Perfil analítico e estratégico",
    };

    // 🔹 Gerar HTML (desktop fixo)
    const html = generateHTML(fakeData);

    // 🔹 Enviar para API de PDF
    const pdfResponse = await fetch("https://api.html2pdf.app/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html,
        apiKey: "SUA_API_KEY_AQUI",
      }),
    });

    const pdfBuffer = await pdfResponse.arrayBuffer();

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=resultado.pdf",
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

function generateHTML(data: any) {
  return `
    <html>
      <head>
        <style>
          body {
            font-family: Arial;
            width: 1200px; /* força layout desktop */
            margin: 0 auto;
          }

          header {
            background: #111;
            color: white;
            padding: 20px;
            text-align: center;
          }

          footer {
            margin-top: 40px;
            padding: 20px;
            background: #f5f5f5;
            text-align: center;
            font-size: 12px;
          }

          .content {
            padding: 40px;
          }
        </style>
      </head>

      <body>
        <header>
          <h1>Seu Sistema de Assessments</h1>
        </header>

        <div class="content">
          <h2>Resultado de ${data.name}</h2>
          <p><strong>Score:</strong> ${data.score}</p>
          <p>${data.result}</p>
        </div>

        <footer>
          Gerado por seu-site.com
        </footer>
      </body>
    </html>
  `;
}
