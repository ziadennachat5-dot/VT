
async function test() {
  const res = await fetch('https://iejqhgkgfantbomgqcev.supabase.co/functions/v1/admin-api', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer qFRSEGZERGRRHGHGFGHFGHFSH',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      action: 'upsert_product',
      payload: {
        id: "714f4168-daf2-4d92-9b0c-7f355642ccba",
        ref: "REF. 004",
        name: "Tideline 200",
        style_tag: "Diver",
        price: 219,
        description: "",
        specs: ["41mm Integrated", "Fixed Bezel", "Sapphire Crystal", "100m WR"],
        stock: 3,
        is_active: true,
        image_url: "https://images.unsplash.com/photo-1587836374828-cb4387df3eb7?auto=format&fit=crop&q=80&w=800"
      }
    })
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

test();
