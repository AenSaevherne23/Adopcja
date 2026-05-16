import { Router } from "express";

const router = Router();

router.get("/breeds", async (req, res) => {
  try {
    const response = await fetch("https://api.thecatapi.com/v1/breeds", {
      headers: {
        "x-api-key": process.env.CAT_API_KEY || "",
      },
    });

    if (!response.ok) {
      return res.status(502).json({
        error: "Nie udało się pobrać ras kotów z zewnętrznego API",
      });
    }

    const data = await response.json();
    res.json(data);
  } catch {
    res.status(500).json({
      error: "Błąd podczas pobierania ras kotów",
    });
  }
});

router.get("/images", async (req, res) => {
  try {
    const breedsResponse = await fetch("https://api.thecatapi.com/v1/breeds", {
      headers: {
        "x-api-key": process.env.CAT_API_KEY || "",
      },
    });

    if (!breedsResponse.ok) {
      return res.status(502).json({
        error: "Nie udało się pobrać ras kotów z zewnętrznego API",
      });
    }

    const breeds = await breedsResponse.json();

    const selectedBreeds = breeds
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    const cats = await Promise.all(
      selectedBreeds.map(async (breed: any) => {
        const imageResponse = await fetch(
          `https://api.thecatapi.com/v1/images/search?limit=1&breed_ids=${breed.id}`,
          {
            headers: {
              "x-api-key": process.env.CAT_API_KEY || "",
            },
          }
        );

        if (!imageResponse.ok) {
          return null;
        }

        const images = await imageResponse.json();
        const image = images[0];

        if (!image) {
          return null;
        }

        return {
          id: image.id,
          url: image.url,
          breeds: [breed],
        };
      })
    );

    res.json(cats.filter(Boolean));
  } catch {
    res.status(500).json({
      error: "Błąd podczas pobierania kotów",
    });
  }
});

export default router;