import { useParams } from 'src/routes/hook';
import { ProductShopView } from 'src/sections/product/view';

export default function ProductCategoryPage() {
  const {slug} = useParams();
  return <ProductShopView categorySlug={slug} />;
}
