package com.laptopstore.backend.security;
import com.laptopstore.backend.entity.User;
import com.laptopstore.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService{
    public final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException{
        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(()->new UsernameNotFoundException("Không Tìm Thấy Người Dùng: " + username));
        return UserDetailsImpl.build(user);
    }
}

