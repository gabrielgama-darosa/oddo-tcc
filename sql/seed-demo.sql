-- Dados opcionais para demonstração do TCC.
-- Senha das três contas: demo12345

INSERT INTO partners (id, name, neighborhood, whatsapp, email, password_hash, password_salt, delivery, pickup)
VALUES
('00000000-0000-0000-0000-00000000000a','Ferragem Central','Centro','5551999990001','central@oddo.local','8b3a5d04a3493e607bfb4794b51149d835a985279879a44cb7fa6fb47caef08da8901b4cbd662e5a91fd5b84e1af4be6fd96e6a11d7871a2db6bf76989783248','742e4f81c97c27f655980a39761c066f',TRUE,TRUE),
('00000000-0000-0000-0000-00000000000b','Casa do Construtor','Vila Nova','5551999990002','casa@oddo.local','c5b11acf66baa149ca85c0b8db0e822be4e27fe1bb6de04d80ef671257972033bd252667563cff44e7a88f950e2000fee5ec4b59833af16f19536eaa4aa101e6','0ae9838346427a14c08a9a1bebdee885',FALSE,TRUE),
('00000000-0000-0000-0000-00000000000c','Mundo da Obra','Jardim Primavera','5551999990003','mundo@oddo.local','04e5d1eda7ff5d54e2d0660fca6be6fe75dbb5a7c130ef42d544473ace7bd0e6c702ea5d49e12a63a5155ab5d1cdb3071ca1cb99d3c8d4e2fa933a15a1874624','9c8106dfad6255fb18f14e6e5f8184cd',TRUE,FALSE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO catalog_products (normalized_key, name, category) VALUES
('cimento cp ii 50 kg|basicos','Cimento CP II 50 kg','Básicos'),
('argamassa ac-ii 20 kg|basicos','Argamassa AC-II 20 kg','Básicos'),
('trena 5 m|ferramentas','Trena 5 m','Ferramentas'),
('furadeira de impacto 500 w|ferramentas','Furadeira de impacto 500 W','Ferramentas'),
('torneira de jardim 1/2"|hidraulica','Torneira de jardim 1/2"','Hidráulica'),
('disjuntor bipolar 40 a|eletrica','Disjuntor bipolar 40 A','Elétrica'),
('tinta acrilica 18 l|revestimentos','Tinta acrílica 18 L','Revestimentos')
ON CONFLICT (normalized_key) DO NOTHING;

INSERT INTO listings (partner_id, product_id, price)
SELECT '00000000-0000-0000-0000-00000000000a', id, v.price
FROM catalog_products cp
JOIN (VALUES
 ('cimento cp ii 50 kg|basicos',36.90::numeric),
 ('argamassa ac-ii 20 kg|basicos',24.90::numeric),
 ('trena 5 m|ferramentas',19.90::numeric),
 ('furadeira de impacto 500 w|ferramentas',219.00::numeric),
 ('torneira de jardim 1/2"|hidraulica',17.90::numeric),
 ('disjuntor bipolar 40 a|eletrica',29.90::numeric),
 ('tinta acrilica 18 l|revestimentos',299.00::numeric)
) AS v(key, price) ON cp.normalized_key = v.key
ON CONFLICT (partner_id, product_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();

INSERT INTO listings (partner_id, product_id, price)
SELECT '00000000-0000-0000-0000-00000000000b', id, v.price
FROM catalog_products cp
JOIN (VALUES
 ('cimento cp ii 50 kg|basicos',34.50::numeric),
 ('argamassa ac-ii 20 kg|basicos',22.90::numeric),
 ('trena 5 m|ferramentas',17.50::numeric),
 ('furadeira de impacto 500 w|ferramentas',199.00::numeric),
 ('torneira de jardim 1/2"|hidraulica',14.90::numeric),
 ('tinta acrilica 18 l|revestimentos',279.00::numeric)
) AS v(key, price) ON cp.normalized_key = v.key
ON CONFLICT (partner_id, product_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();

INSERT INTO listings (partner_id, product_id, price)
SELECT '00000000-0000-0000-0000-00000000000c', id, v.price
FROM catalog_products cp
JOIN (VALUES
 ('cimento cp ii 50 kg|basicos',38.00::numeric),
 ('argamassa ac-ii 20 kg|basicos',23.90::numeric),
 ('furadeira de impacto 500 w|ferramentas',209.00::numeric),
 ('torneira de jardim 1/2"|hidraulica',15.50::numeric),
 ('disjuntor bipolar 40 a|eletrica',28.90::numeric),
 ('tinta acrilica 18 l|revestimentos',289.00::numeric)
) AS v(key, price) ON cp.normalized_key = v.key
ON CONFLICT (partner_id, product_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();
