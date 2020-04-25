DROP TABLE IF EXISTS newtable;

CREATE TABLE newtable (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    age VARCHAR(255),
    zodiac VARCHAR(255),
    good_traits TEXT,
    bad_traits TEXT

)