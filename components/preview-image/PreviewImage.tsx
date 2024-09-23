import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const PreviewImage = ({src}:{src:string}) => {
  return (
    <Avatar className='rounded-none'>
      <AvatarImage src={src} className='object-cover'/>
      <AvatarFallback className='object-cover'>CN</AvatarFallback>
    </Avatar>
  );
};

export default PreviewImage;
